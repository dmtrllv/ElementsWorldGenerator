import type { MainEvents, ThreadEvents } from "./manager";

export class Thread {
	private static eventId: number = 0;

	private static nextEventId(): number {
		return this.eventId++;
	}

	public readonly worker: Worker;
	public readonly eventResponseListeners = new Map<number, () => void>();
	public readonly handlers = new Map<string, ((data: any) => void)[]>();

	public constructor() {
		this.worker = new Worker(new URL("./generator-worker.ts", import.meta.url), { type: "module" });
		this.worker.onmessage = this.handleMessage;
	}

	public async emit<K extends keyof MainEvents>(key: K, data: MainEvents[K]): Promise<void> {
		const id = Thread.nextEventId();
		const promise = new Promise<void>((res) => this.eventResponseListeners.set(id, res));
		this.worker.postMessage([id, key, data]);
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
				Promise.all(handlers.map(handler => handler(data))).then(() => this.worker.postMessage([id, "__event-response__"]));
		}
	}

	public on<K extends keyof ThreadEvents>(event: K, handler: (data: ThreadEvents[K]) => void) {
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