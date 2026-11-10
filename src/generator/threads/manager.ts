import type { GenerationScope } from "../passes";
import { Thread } from "./thread";

export class ThreadManager {
	private readonly threads: ReadonlyArray<Thread> = [];

	private readonly queue: QueuedEvent[] = [];

	private readonly freeThreads: Thread[] = [];

	public static async initialize() {
		const manager = new ThreadManager();
		await manager.broadcast("init", {});
		return manager;
	}

	private constructor() {
		this.threads = new Array((navigator.hardwareConcurrency || 4) - 1).fill(0).map(_ => new Thread());
		this.freeThreads = [...this.threads];
	}

	public async broadcast<K extends keyof MainEvents>(event: K, data: MainEvents[K]): Promise<void> {
		await Promise.all(this.threads.map(t => t.emit(event, data)));
	}

	private getEvent(): QueuedEvent | null {
		const event = this.queue.splice(0, 1);
		return event[0] || null;
	}

	private async flushQueue(thread: Thread) {
		let event = this.getEvent();
		while (event) {
			await thread.emit(event.event, event.data);
			event.resolver();
			event = this.getEvent();
		}
		this.freeThreads.push(thread);
	}

	public async emit<K extends keyof MainEvents>(event: K, data: MainEvents[K]): Promise<void> {
		return new Promise((resolver) => {
			this.queue.push({
				event,
				data,
				resolver
			});

			const thread = this.freeThreads.pop();
			if (thread) {
				this.flushQueue(thread);
			}
		});
	}
}

type QueuedEvent = {
	readonly event: keyof MainEvents;
	readonly data: MainEvents[keyof MainEvents];
	readonly resolver: () => void;
};

export type MainEvents = {
	readonly init: {};
	readonly sync: SyncEvent;
	readonly generate: GenerateEvent;
};

export type SyncEvent = {
	readonly worldParamsJson: string;
	readonly seed: number;
	readonly generation: number;
};

export type GenerateEvent = {
	readonly mapId: string;
	readonly type: string;
	readonly scope: GenerationScope;
	readonly chunk?: readonly [number, number] | undefined;
	readonly resolution: number;
};

export type ThreadEvents = {
	readonly generated: GeneratedEvent;
};

export type GeneratedEvent = {
	readonly mapId: string;
}