
import type { MainEvents } from "../manager";

class WorkerEventManager {
	public readonly handlers = new Map<string, ((data: any) => any | Promise<any>)[]>();

	public constructor() {
		self.onmessage = this.handleMessage;
	}

	private handleMessage = async (e: MessageEvent) => {
		if (!Array.isArray(e.data))
			return;

		const [id, event, data = {}] = e.data;

		if (event === "__event-response__")
			return;

		try {
			const handlers = this.handlers.get(event);

			if (!handlers)
				throw new Error(`No handler registered for event "${event}".`);

			const results = await Promise.all(handlers.map(handler => handler(data)));
			const result = results.length === 1 ? results[0] : results;

			self.postMessage([id, "__event-response__", result]);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			self.postMessage([id, "__event-error__", message]);
		}
	};

	public on<K extends keyof MainEvents>(event: K, handler: (data: MainEvents[K]) => any | Promise<any>) {
		if (!this.handlers.has(event))
			this.handlers.set(event, []);

		const handlers = this.handlers.get(event)!;
		handlers.push(handler);

		return () => {
			const i = handlers.indexOf(handler);

			if (i > -1)
				handlers.splice(i, 1);
		};
	}
}

export const events = new WorkerEventManager();
