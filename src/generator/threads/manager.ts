import type { GenerationScope } from "../passes";
import type { SampleRegion } from "../maps";
import { Thread } from "./thread";
import { SharedWorkQueue } from "./work-queue";
import { SharedOutputs } from "./shared-outputs";
import { TaskTypes } from "./task-types";
import { TaskRegistry } from "./task-registry";

export class ThreadManager {
	private static readonly TASK_CAPACITY = 65536;
	private static readonly CONTINUATION_CAPACITY = 262144;

	public readonly registry: TaskRegistry;

	public readonly outputs: SharedOutputs;
	private readonly taskTypes: TaskTypes;

	private readonly threads: ReadonlyArray<Thread> = [];
	private readonly queue: QueuedEvent[] = [];
	private readonly freeThreads: Thread[] = [];
	private readonly workQueues: SharedWorkQueue[] = [];

	public static async initialize(arenaCapacity: number = 64 * 1024 * 1024) {
		const manager = new ThreadManager();

		const arenas: any = await Promise.all(manager.threads.map((thread, workerId) => thread.emit("init", {
			workerId,
			queues: manager.workQueues.map(queue => queue.buffer),
			arenaCapacity
		})));

		await Promise.all(manager.threads.map(thread => thread.emit("configure", {
			arenas,
			registry: manager.registry.buffer,
			outputs: manager.outputs.buffer,
			taskCapacity: ThreadManager.TASK_CAPACITY,
			continuationCapacity: ThreadManager.CONTINUATION_CAPACITY,
			maxOutputs: manager.taskTypes.maxOutputs
		})));

		return manager;
	}

	private constructor() {
		const count = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
		this.registry = TaskRegistry.create(ThreadManager.TASK_CAPACITY, ThreadManager.CONTINUATION_CAPACITY);
		this.taskTypes = new TaskTypes();
		this.outputs = SharedOutputs.create(ThreadManager.TASK_CAPACITY, this.taskTypes.maxOutputs);
		this.workQueues = new Array(count).fill(0).map(() => SharedWorkQueue.create());
		this.threads = new Array(count).fill(0).map(() => new Thread());
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
	readonly init: InitEvent;
	readonly configure: ConfigureEvent;
	readonly sync: SyncEvent;
	readonly generate: GenerateEvent;
};

export type InitEvent = {
	readonly workerId: number;
	readonly queues: readonly SharedArrayBuffer[];
	readonly arenaCapacity: number;
};

export type ConfigureEvent = {
	readonly arenas: readonly SharedArrayBuffer[];
	readonly registry: SharedArrayBuffer;
	readonly outputs: SharedArrayBuffer;
	readonly taskCapacity: number;
	readonly continuationCapacity: number;
	readonly maxOutputs: number;
};

export type MainEventResponses = {
	readonly init: void;
	readonly configure: void;
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
	readonly inputs: Readonly<Record<string, MapOutputDescriptor>>;
};

export type GeneratedMap = MapBufferDescriptor;

export type GeneratedEvent = {
	readonly outputs: MapOutputDescriptor[];
};

export type MapOutputDescriptor = {
	readonly type: string;
	readonly workerId: number;
	readonly offset: number;
	readonly byteLength: number;
	readonly samples: SampleRegion;
};