import type { MainEvents, MainEventResponses } from "./manager";

export class Thread {
	private static eventId: number = 0;

	private static nextEventId(): number {
		return this.eventId++;
	}

	public readonly worker: Worker;
	public readonly eventResponseListeners = new Map<number, {
		readonly resolve: (result: any) => void;
		readonly reject: (error: unknown) => void;
	}>();

	public constructor() {
		this.worker = new Worker(new URL("./generator-worker.ts", import.meta.url), { type: "module" });
		this.worker.onmessage = this.handleMessage;
		this.worker.onerror = this.handleError;
		this.worker.onmessageerror = this.handleMessageError;
	}

	public async emit<K extends keyof MainEvents>(key: K, data: MainEvents[K]): Promise<MainEventResponses[K]> {
		const id = Thread.nextEventId();

		const promise = new Promise<MainEventResponses[K]>((resolve, reject) => {
			this.eventResponseListeners.set(id, { resolve, reject });
		});

		try {
			this.worker.postMessage([id, key, data]);
		} catch (error) {
			this.eventResponseListeners.delete(id);
			throw error;
		}

		return promise;
	}

	private handleMessage = (e: MessageEvent) => {
		if (!Array.isArray(e.data))
			return;

		const [id, event, data] = e.data;

		if (event !== "__event-response__" && event !== "__event-error__")
			return;

		const listener = this.eventResponseListeners.get(id);

		if (!listener)
			return;

		this.eventResponseListeners.delete(id);

		if (event === "__event-error__")
			listener.reject(new Error(data));
		else
			listener.resolve(data);
	};

	private handleError = (e: ErrorEvent) => {
		for (const listener of this.eventResponseListeners.values())
			listener.reject(e.error ?? new Error(e.message));

		this.eventResponseListeners.clear();
	};

	private handleMessageError = () => {
		for (const listener of this.eventResponseListeners.values())
			listener.reject(new Error("Failed to deserialize worker message."));

		this.eventResponseListeners.clear();
	};
}
