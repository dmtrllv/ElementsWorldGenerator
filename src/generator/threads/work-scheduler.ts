import { SharedWorkQueue } from "./work-queue";

export class WorkScheduler {
	private readonly queues: SharedWorkQueue[];
	private readonly overflow: number[] = [];

	private readonly workerId: number;
	private readonly wakeup: Int32Array;

	private overflowHead = 0;
	private stealIndex: number;

	public constructor(workerId: number, buffers: SharedArrayBuffer[], wakeup: SharedArrayBuffer) {
		if (!Number.isSafeInteger(workerId) || workerId < 0 || workerId >= buffers.length)
			throw new RangeError("Invalid worker ID.");

		if (wakeup.byteLength !== Int32Array.BYTES_PER_ELEMENT)
			throw new RangeError("Invalid scheduler wake-up buffer.");

		this.workerId = workerId;
		this.stealIndex = (workerId + 1) % buffers.length;
		this.wakeup = new Int32Array(wakeup);

		this.queues = buffers.map(buffer => {
			const capacity = buffer.byteLength / Int32Array.BYTES_PER_ELEMENT - 3;
			return new SharedWorkQueue(buffer, capacity);
		});
	}

	public enqueue(task: number): void {
		this.enqueueMany([task]);
	}

	public enqueueMany(tasks: readonly number[]): void {
		if (tasks.length === 0)
			return;

		for (const task of tasks) {
			if (!Number.isSafeInteger(task) || task < 1)
				throw new RangeError("Task ID must be a positive safe integer.");

			if (this.queues[this.workerId]!.push(task))
				continue;

			let queued = false;

			for (let i = 1; i < this.queues.length; i++) {
				const index = (this.workerId + i) % this.queues.length;

				if (this.queues[index]!.push(task)) {
					queued = true;
					break;
				}
			}

			if (!queued)
				this.overflow.push(task);
		}

		this.wake();
	}

	public next(): number {
		this.flushOverflow();

		const local = this.queues[this.workerId]!.pop();

		if (local !== -1)
			return local;

		for (let i = 0; i < this.queues.length; i++) {
			const index = (this.stealIndex + i) % this.queues.length;

			if (index === this.workerId)
				continue;

			const task = this.queues[index]!.steal();

			if (task !== -1) {
				this.stealIndex = (index + 1) % this.queues.length;
				return task;
			}
		}

		return this.takeOverflow();
	}

	public get sequence(): number {
		return Atomics.load(this.wakeup, 0);
	}

	public wake(): void {
		Atomics.add(this.wakeup, 0, 1);
		Atomics.notify(this.wakeup, 0);
	}

	public async waitForChange(sequence: number): Promise<void> {
		if (typeof Atomics.waitAsync === "function") {
			const waiter = Atomics.waitAsync(this.wakeup, 0, sequence);

			if (waiter.async)
				await waiter.value;

			return;
		}

		await new Promise<void>(resolve => setTimeout(resolve, 8));
	}

	private takeOverflow(): number {
		if (this.overflowHead >= this.overflow.length)
			return -1;

		const task = this.overflow[this.overflowHead++]!;

		if (this.overflowHead === this.overflow.length) {
			this.overflow.length = 0;
			this.overflowHead = 0;
		}

		return task;
	}

	private flushOverflow(): void {
		while (this.overflowHead < this.overflow.length) {
			const task = this.overflow[this.overflowHead]!;
			let queued = this.queues[this.workerId]!.push(task);

			for (let i = 1; !queued && i < this.queues.length; i++) {
				const index = (this.workerId + i) % this.queues.length;
				queued = this.queues[index]!.push(task);
			}

			if (!queued)
				return;

			this.overflowHead++;
		}

		this.overflow.length = 0;
		this.overflowHead = 0;
	}
}
