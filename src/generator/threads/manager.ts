import type { SampleRegion } from "../maps";
import { Thread } from "./thread";
import { SharedWorkQueue } from "./work-queue";
import { SharedOutputs, type SharedOutput } from "./shared-outputs";
import { TaskTypes } from "./task-types";
import { TaskRegistry } from "./task-registry";

export type RootTask = {
	readonly pass: number;
	readonly scope: 0 | 1;
	readonly resolution: number;
	readonly chunkX: number;
	readonly chunkZ: number;
};

export class ThreadManager {
	private static readonly TASK_CAPACITY = 262144;
	private static readonly CONTINUATION_CAPACITY = 1048576;

	public readonly registry: TaskRegistry;
	public readonly outputs: SharedOutputs;
	public readonly taskTypes: TaskTypes;
	public arenas: readonly SharedArrayBuffer[] = [];

	private readonly threads: ReadonlyArray<Thread>;
	private readonly workQueues: SharedWorkQueue[];
	private readonly wakeup: SharedArrayBuffer;

	private nextThread = 0;
	private currentGeneration = -1;
	private activeRequests = 0;
	private readonly idleWaiters: (() => void)[] = [];
	private generationQueue: Promise<void> = Promise.resolve();

	public static async initialize(arenaCapacity: number = 64 * 1024 * 1024, arenaMaxCapacity: number = 1024 * 1024 * 1024): Promise<ThreadManager> {
		const manager = new ThreadManager();
		const arenas = await Promise.all(manager.threads.map((thread, workerId) => thread.emit("init", {
			workerId,
			queues: manager.workQueues.map(queue => queue.buffer),
			wakeup: manager.wakeup,
			arenaCapacity,
			arenaMaxCapacity
		})));

		manager.arenas = arenas;

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
		this.wakeup = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
		this.arenas = [];
	}

	public async broadcast<K extends keyof MainEvents>(event: K, data: MainEvents[K]): Promise<void> {
		await Promise.all(this.threads.map(thread => thread.emit(event, data)));
	}

	public beginGeneration(event: SyncEvent): Promise<void> {
		this.currentGeneration = event.generation;

		const operation = this.generationQueue.then(async () => {
			await this.waitForIdle();
			await this.broadcast("pause", undefined);

			for (const queue of this.workQueues)
				queue.clear();

			this.registry.reset();
			this.outputs.reset();

			await this.broadcast("sync", event);
		});

		this.generationQueue = operation.catch(() => {});

		return operation;
	}

	public async generateMany(generation: number, roots: readonly RootTask[]): Promise<number[]> {
		if (generation !== this.currentGeneration)
			throw new Error("Cannot generate tasks for an inactive generation.");

		if (roots.length === 0)
			return [];

		const thread = this.threads[this.nextThread++ % this.threads.length]!;

		this.activeRequests++;

		try {
			const result = await thread.emit("generate", { generation, roots });
			return result.taskIds;
		} finally {
			this.activeRequests--;

			if (this.activeRequests === 0) {
				for (const resolve of this.idleWaiters.splice(0))
					resolve();
			}
		}
	}

	public getOutput(taskId: number, outputIndex: number): SharedOutput | null {
		return this.outputs.get(taskId, outputIndex);
	}

	private waitForIdle(): Promise<void> {
		if (this.activeRequests === 0)
			return Promise.resolve();

		return new Promise(resolve => this.idleWaiters.push(resolve));
	}
}

export type MainEvents = {
	readonly init: InitEvent;
	readonly configure: ConfigureEvent;
	readonly pause: undefined;
	readonly sync: SyncEvent;
	readonly generate: GenerateEvent;
};

export type MainEventResponses = {
	readonly init: SharedArrayBuffer;
	readonly configure: void;
	readonly pause: void;
	readonly sync: void;
	readonly generate: GeneratedEvent;
};

export type InitEvent = {
	readonly workerId: number;
	readonly queues: readonly SharedArrayBuffer[];
	readonly wakeup: SharedArrayBuffer;
	readonly arenaCapacity: number;
	readonly arenaMaxCapacity: number;
};

export type ConfigureEvent = {
	readonly arenas: readonly SharedArrayBuffer[];
	readonly registry: SharedArrayBuffer;
	readonly outputs: SharedArrayBuffer;
	readonly taskCapacity: number;
	readonly continuationCapacity: number;
	readonly maxOutputs: number;
};

export type SyncEvent = {
	readonly worldParamsJson: string;
	readonly seed: number;
	readonly generation: number;
};

export type GenerateEvent = {
	readonly generation: number;
	readonly roots: readonly RootTask[];
};

export type GeneratedEvent = {
	readonly taskIds: number[];
};

export type MapOutputDescriptor = SharedOutput;

export type MapBufferDescriptor = {
	readonly type: string;
	readonly buffer: SharedArrayBuffer;
	readonly samples: SampleRegion;
};
