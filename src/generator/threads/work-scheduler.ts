import { SharedWorkQueue } from "./work-queue";

export class WorkScheduler {
	private readonly queues: SharedWorkQueue[];
	private readonly overflow: number[] = [];

	private readonly workerId: number;
	private stealIndex: number;

	public constructor(workerId: number, buffers: SharedArrayBuffer[]) {
		if (!Number.isSafeInteger(workerId) || workerId < 0 || workerId >= buffers.length)
			throw new RangeError("Invalid worker ID.");

		this.workerId = workerId;
		this.stealIndex = (workerId + 1) % buffers.length;
		this.queues = buffers.map(buffer => {
			const capacity = buffer.byteLength / Int32Array.BYTES_PER_ELEMENT - 3;
			return new SharedWorkQueue(buffer, capacity);
		});
	}

	public enqueue(task: number): void {
		if (!Number.isSafeInteger(task) || task < 0)
			throw new RangeError("Task ID must be a non-negative safe integer.");

		if (this.queues[this.workerId]!.push(task))
			return;

		for (let i = 1; i < this.queues.length; i++) {
			const index = (this.workerId + i) % this.queues.length;

			if (this.queues[index]!.push(task))
				return;
		}

		this.overflow.push(task);
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

		return this.overflow.shift() ?? -1;
	}

	public get pendingOverflow(): number {
		return this.overflow.length;
	}

	private flushOverflow(): void {
		while (this.overflow.length > 0) {
			const task = this.overflow[0]!;
			let queued = this.queues[this.workerId]!.push(task);

			for (let i = 1; !queued && i < this.queues.length; i++) {
				const index = (this.workerId + i) % this.queues.length;
				queued = this.queues[index]!.push(task);
			}

			if (!queued)
				return;

			this.overflow.shift();
		}
	}
}
