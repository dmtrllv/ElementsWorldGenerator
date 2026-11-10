const HEADER_SIZE = 5;
const TASK_SIZE = 10;
const CONTINUATION_SIZE = 2;

export const TaskState = {
	Empty: 0,
	Registering: 1,
	Waiting: 2,
	Queued: 3,
	Running: 4,
	Complete: 5,
	Failed: 6
} as const;

export type TaskKey = {
	readonly generation: number;
	readonly pass: number;
	readonly scope: 0 | 1;
	readonly resolution: number;
	readonly chunkX: number;
	readonly chunkZ: number;
};

export type TaskRegistration = {
	readonly id: number;
	readonly created: boolean;
};

export class TaskRegistry {
	private readonly control: Int32Array;
	private readonly table: Int32Array;
	private readonly tasks: Int32Array;
	private readonly continuations: Int32Array;

	private readonly tableCapacity: number;
	private readonly taskCapacity: number;
	private readonly continuationCapacity: number;

	public static create(taskCapacity: number = 262144, continuationCapacity: number = 1048576): TaskRegistry {
		if (!Number.isSafeInteger(taskCapacity) || taskCapacity < 2)
			throw new RangeError("Task capacity must be at least 2.");

		if (!Number.isSafeInteger(continuationCapacity) || continuationCapacity < 1)
			throw new RangeError("Continuation capacity must be positive.");

		const tableCapacity = this.nextPowerOfTwo(taskCapacity * 2);
		const intCount = HEADER_SIZE + tableCapacity + taskCapacity * TASK_SIZE + continuationCapacity * CONTINUATION_SIZE;
		const buffer = new SharedArrayBuffer(intCount * Int32Array.BYTES_PER_ELEMENT);

		return new TaskRegistry(buffer, taskCapacity, continuationCapacity);
	}

	public constructor(buffer: SharedArrayBuffer, taskCapacity: number, continuationCapacity: number) {
		this.taskCapacity = taskCapacity;
		this.continuationCapacity = continuationCapacity;
		this.tableCapacity = TaskRegistry.nextPowerOfTwo(taskCapacity * 2);

		const expectedSize = HEADER_SIZE + this.tableCapacity + taskCapacity * TASK_SIZE + continuationCapacity * CONTINUATION_SIZE;

		if (buffer.byteLength !== expectedSize * Int32Array.BYTES_PER_ELEMENT)
			throw new RangeError("Invalid task registry buffer size.");

		this.control = new Int32Array(buffer, 0, HEADER_SIZE);
		this.table = new Int32Array(buffer, HEADER_SIZE * 4, this.tableCapacity);
		this.tasks = new Int32Array(buffer, (HEADER_SIZE + this.tableCapacity) * 4, taskCapacity * TASK_SIZE);
		this.continuations = new Int32Array(buffer, (HEADER_SIZE + this.tableCapacity + taskCapacity * TASK_SIZE) * 4, continuationCapacity * CONTINUATION_SIZE);
	}

	public get buffer(): SharedArrayBuffer {
		return this.control.buffer as SharedArrayBuffer;
	}

	public register(key: TaskKey, workerId: number): TaskRegistration {
		this.validateKey(key);

		this.lock();

		try {
			const hash = this.hash(key);
			let index = hash & (this.tableCapacity - 1);

			for (let i = 0; i < this.tableCapacity; i++) {
				const id = this.table[index]!;

				if (id === 0) {
					const taskCount = Atomics.load(this.control, 1);

					if (taskCount >= this.taskCapacity)
						throw new Error("Task registry capacity exceeded.");

					const taskId = taskCount + 1;
					const offset = (taskId - 1) * TASK_SIZE;

					this.writeKey(offset, key);
					this.tasks[offset + 9] = workerId;

					Atomics.store(this.tasks, offset, TaskState.Registering);
					this.table[index] = taskId;
					Atomics.store(this.control, 1, taskId);

					return { id: taskId, created: true };
				}

				if (this.matches((id - 1) * TASK_SIZE, key))
					return { id, created: false };

				index = (index + 1) & (this.tableCapacity - 1);
			}

			throw new Error("Task registry hash table is full.");
		} finally {
			this.unlock();
		}
	}

	public find(key: TaskKey): number | null {
		this.validateKey(key);
		this.lock();

		try {
			let index = this.hash(key) & (this.tableCapacity - 1);

			for (let i = 0; i < this.tableCapacity; i++) {
				const id = this.table[index]!;

				if (id === 0)
					return null;

				if (this.matches((id - 1) * TASK_SIZE, key))
					return id;

				index = (index + 1) & (this.tableCapacity - 1);
			}

			return null;
		} finally {
			this.unlock();
		}
	}

	public getKey(id: number): TaskKey {
		const offset = this.getTaskOffset(id);

		return {
			generation: this.tasks[offset + 1]!,
			pass: this.tasks[offset + 2]!,
			scope: this.tasks[offset + 3]! as 0 | 1,
			resolution: this.tasks[offset + 4]!,
			chunkX: this.tasks[offset + 5]!,
			chunkZ: this.tasks[offset + 6]!
		};
	}

	public addDependency(parentId: number, prerequisiteId: number): "added" | "complete" | "failed" {
		this.lock();

		try {
			const parentOffset = this.getTaskOffset(parentId);
			const prerequisiteOffset = this.getTaskOffset(prerequisiteId);
			const parentState = Atomics.load(this.tasks, parentOffset);
			const prerequisiteState = Atomics.load(this.tasks, prerequisiteOffset);

			if (parentState !== TaskState.Registering)
				throw new Error("Dependencies can only be added while a task is registering.");

			if (parentId === prerequisiteId)
				throw new Error("A task cannot depend on itself.");

			if (prerequisiteState === TaskState.Failed)
				return "failed";

			if (prerequisiteState === TaskState.Complete)
				return "complete";

			let continuationId = this.tasks[prerequisiteOffset + 8]!;

			while (continuationId !== 0) {
				const continuationOffset = (continuationId - 1) * CONTINUATION_SIZE;

				if (this.continuations[continuationOffset] === parentId)
					return "added";

				continuationId = this.continuations[continuationOffset + 1]!;
			}

			const continuationCount = Atomics.load(this.control, 2);

			if (continuationCount >= this.continuationCapacity)
				throw new Error("Task continuation capacity exceeded.");

			const newContinuationId = continuationCount + 1;
			const continuationOffset = (newContinuationId - 1) * CONTINUATION_SIZE;

			this.continuations[continuationOffset] = parentId;
			this.continuations[continuationOffset + 1] = this.tasks[prerequisiteOffset + 8]!;
			this.tasks[prerequisiteOffset + 8] = newContinuationId;

			this.tasks[parentOffset + 7] = this.tasks[parentOffset + 7]! + 1;
			Atomics.store(this.control, 2, newContinuationId);

			return "added";
		} finally {
			this.unlock();
		}
	}

	public seal(id: number): boolean {
		this.lock();

		try {
			const offset = this.getTaskOffset(id);

			if (Atomics.load(this.tasks, offset) !== TaskState.Registering)
				throw new Error("Only registering tasks can be sealed.");

			const ready = this.tasks[offset + 7] === 0;

			Atomics.store(this.tasks, offset, ready ? TaskState.Queued : TaskState.Waiting);

			return ready;
		} finally {
			this.unlock();
		}
	}

	public claim(id: number): boolean {
		this.lock();

		try {
			const offset = this.getTaskOffset(id);

			if (Atomics.load(this.tasks, offset) !== TaskState.Queued)
				return false;

			Atomics.store(this.tasks, offset, TaskState.Running);

			return true;
		} finally {
			this.unlock();
		}
	}

	public complete(id: number): number[] {
		this.lock();

		try {
			const offset = this.getTaskOffset(id);

			if (Atomics.load(this.tasks, offset) !== TaskState.Running)
				throw new Error("Only running tasks can complete.");

			Atomics.store(this.tasks, offset, TaskState.Complete);
			Atomics.notify(this.tasks, offset);

			const ready: number[] = [];
			let continuationId = this.tasks[offset + 8]!;

			while (continuationId !== 0) {
				const continuationOffset = (continuationId - 1) * CONTINUATION_SIZE;
				const parentId = this.continuations[continuationOffset]!;
				const parentOffset = this.getTaskOffset(parentId);
				const parentState = Atomics.load(this.tasks, parentOffset);

				if (parentState === TaskState.Registering || parentState === TaskState.Waiting) {
					const dependencies = this.tasks[parentOffset + 7]! - 1;

					if (dependencies < 0)
						throw new Error("Task dependency counter underflow.");

					this.tasks[parentOffset + 7] = dependencies;

					if (dependencies === 0 && parentState === TaskState.Waiting) {
						Atomics.store(this.tasks, parentOffset, TaskState.Queued);
						ready.push(parentId);
					}
				}

				continuationId = this.continuations[continuationOffset + 1]!;
			}

			return ready;
		} finally {
			this.unlock();
		}
	}

	public fail(id: number): number[] {
		this.lock();

		try {
			const failed: number[] = [];
			const pending = [id];

			while (pending.length > 0) {
				const taskId = pending.pop()!;
				const offset = this.getTaskOffset(taskId);
				const state = Atomics.load(this.tasks, offset);

				if (state === TaskState.Complete || state === TaskState.Failed)
					continue;

				Atomics.store(this.tasks, offset, TaskState.Failed);
				Atomics.notify(this.tasks, offset);
				failed.push(taskId);

				let continuationId = this.tasks[offset + 8]!;

				while (continuationId !== 0) {
					const continuationOffset = (continuationId - 1) * CONTINUATION_SIZE;
					pending.push(this.continuations[continuationOffset]!);
					continuationId = this.continuations[continuationOffset + 1]!;
				}
			}

			return failed;
		} finally {
			this.unlock();
		}
	}

	public getState(id: number): number {
		return Atomics.load(this.tasks, this.getTaskOffset(id));
	}

	public async waitForCompletion(id: number): Promise<void> {
		const offset = this.getTaskOffset(id);

		while (true) {
			const state = Atomics.load(this.tasks, offset);

			if (state === TaskState.Complete)
				return;

			if (state === TaskState.Failed)
				throw new Error(`Task ${id} failed.`);

			const waiter = Atomics.waitAsync(this.tasks, offset, state);

			if (waiter.async)
				await waiter.value;
		}
	}

	public isIdle(): boolean {
		const count = Atomics.load(this.control, 1);

		for (let i = 0; i < count; i++) {
			const state = Atomics.load(this.tasks, i * TASK_SIZE);

			if (state !== TaskState.Complete && state !== TaskState.Failed)
				return false;
		}

		return true;
	}

	public reset(): void {
		this.table.fill(0);
		this.tasks.fill(0);
		this.continuations.fill(0);

		Atomics.store(this.control, 1, 0);
		Atomics.store(this.control, 2, 0);
		Atomics.store(this.control, 0, 0);
	}

	private writeKey(offset: number, key: TaskKey): void {
		this.tasks[offset + 1] = key.generation;
		this.tasks[offset + 2] = key.pass;
		this.tasks[offset + 3] = key.scope;
		this.tasks[offset + 4] = key.resolution;
		this.tasks[offset + 5] = key.chunkX;
		this.tasks[offset + 6] = key.chunkZ;
		this.tasks[offset + 7] = 0;
		this.tasks[offset + 8] = 0;
	}

	private matches(offset: number, key: TaskKey): boolean {
		return this.tasks[offset + 1] === key.generation &&
			this.tasks[offset + 2] === key.pass &&
			this.tasks[offset + 3] === key.scope &&
			this.tasks[offset + 4] === key.resolution &&
			this.tasks[offset + 5] === key.chunkX &&
			this.tasks[offset + 6] === key.chunkZ;
	}

	private getTaskOffset(id: number): number {
		if (!Number.isSafeInteger(id) || id < 1 || id > Atomics.load(this.control, 1))
			throw new RangeError(`Invalid task ID ${id}.`);

		return (id - 1) * TASK_SIZE;
	}

	private validateKey(key: TaskKey): void {
		for (const value of [key.generation, key.pass, key.scope, key.resolution, key.chunkX, key.chunkZ]) {
			if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)
				throw new RangeError("Task key values must be signed 32-bit integers.");
		}

		if (key.scope !== 0 && key.scope !== 1)
			throw new RangeError("Invalid task scope.");

		if (key.resolution < 1)
			throw new RangeError("Resolution must be positive.");
	}

	private hash(key: TaskKey): number {
		let hash = 2166136261;

		for (const value of [key.generation, key.pass, key.scope, key.resolution, key.chunkX, key.chunkZ])
			hash = Math.imul(hash ^ value, 16777619);

		return hash >>> 0;
	}

	private lock(): void {
		while (Atomics.compareExchange(this.control, 0, 0, 1) !== 0)
			Atomics.wait(this.control, 0, 1);
	}

	private unlock(): void {
		Atomics.store(this.control, 0, 0);
		Atomics.notify(this.control, 0, 1);
	}

	private static nextPowerOfTwo(value: number): number {
		let result = 1;

		while (result < value)
			result *= 2;

		return result;
	}
}
