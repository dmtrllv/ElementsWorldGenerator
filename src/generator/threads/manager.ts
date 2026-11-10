import type { GenerationScope } from "../passes";
import type { SampleRegion } from "../maps";
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
		this.threads = new Array(Math.max(1, (navigator.hardwareConcurrency || 4) - 1)).fill(0).map(_ => new Thread());
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
			try {
				const result = await thread.emit(event.event as any, event.data as any);
				event.resolver(result);
			} catch (error) {
				event.rejecter(error);
			}

			event = this.getEvent();
		}

		this.freeThreads.push(thread);
	}

	public async emit<K extends keyof MainEvents>(event: K, data: MainEvents[K]): Promise<MainEventResponses[K]> {
		return new Promise((resolver, rejecter) => {
			this.queue.push({
				event,
				data,
				resolver,
				rejecter
			});

			const thread = this.freeThreads.pop();

			if (thread)
				this.flushQueue(thread);
		});
	}
}

type QueuedEvent = {
	readonly event: keyof MainEvents;
	readonly data: MainEvents[keyof MainEvents];
	readonly resolver: (result: any) => void;
	readonly rejecter: (error: unknown) => void;
};

export type MainEvents = {
	readonly init: {};
	readonly sync: SyncEvent;
	readonly generate: GenerateEvent;
};

export type MainEventResponses = {
	readonly init: void;
	readonly sync: void;
	readonly generate: GeneratedEvent;
};

export type SyncEvent = {
	readonly worldParamsJson: string;
	readonly seed: number;
	readonly generation: number;
};

export type MapBufferDescriptor = {
	readonly type: string;
	readonly buffer: SharedArrayBuffer;
	readonly samples: SampleRegion;
};

export type GenerateEvent = {
	readonly generation: number;
	readonly type: string;
	readonly scope: GenerationScope;
	readonly resolution: number;
	readonly region: {
		readonly x: number;
		readonly z: number;
		readonly width: number;
		readonly height: number;
	};
	readonly inputs: Readonly<Record<string, MapBufferDescriptor>>;
};

export type GeneratedMap = MapBufferDescriptor;

export type GeneratedEvent = {
	readonly outputs: readonly GeneratedMap[];
};
