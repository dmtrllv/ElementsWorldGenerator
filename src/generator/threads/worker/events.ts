import type { MainEvents, ThreadEvents } from "../manager";

class WorkerEventManager {
	private eventId: number = 0;

	public readonly eventResponseListeners = new Map<number, () => void>();
	public readonly handlers = new Map<string, ((data: any) => void)[]>();

	public constructor() {
		self.onmessage = this.handleMessage;
	}

	public async emit<K extends keyof ThreadEvents>(key: K, data: ThreadEvents[K]): Promise<void> {
		const id = this.eventId++;
		const promise = new Promise<void>((res) => this.eventResponseListeners.set(id, res));
		self.postMessage([id, key, data]);
		return promise;
	}

	private handleMessage = (e: MessageEvent) => {
		if (!Array.isArray(e.data))
			return;
		const [id, event, data = {}] = e.data;
		if (event === "__event-response__") {
			const handler = this.eventResponseListeners.get(id);
			if (!handler)
				return;
			this.eventResponseListeners.delete(id);
			handler();
		} else {
			const handlers = this.handlers.get(event);
			if (handlers)
				Promise.all(handlers.map(handler => handler(data))).then(() => self.postMessage([id, "__event-response__"]));
		}
	}

	public on<K extends keyof MainEvents>(event: K, handler: (data: MainEvents[K]) => void) {
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