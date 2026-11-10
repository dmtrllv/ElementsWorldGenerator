export class SharedWorkQueue {
	private readonly control: Int32Array;
	private readonly tasks: Int32Array;

	public readonly capacity: number;

	public static create(capacity: number = 4096): SharedWorkQueue {
		if (!Number.isSafeInteger(capacity) || capacity < 2 || (capacity & (capacity - 1)) !== 0)
			throw new RangeError("Queue capacity must be a power of two greater than one.");

		const buffer = new SharedArrayBuffer((3 + capacity) * Int32Array.BYTES_PER_ELEMENT);

		return new SharedWorkQueue(buffer, capacity);
	}

	public constructor(buffer: SharedArrayBuffer, capacity: number) {
		if (!Number.isSafeInteger(capacity) || capacity < 2 || (capacity & (capacity - 1)) !== 0)
			throw new RangeError("Queue capacity must be a power of two greater than one.");

		if (buffer.byteLength !== (3 + capacity) * Int32Array.BYTES_PER_ELEMENT)
			throw new RangeError("Invalid work queue buffer size.");

		this.capacity = capacity;
		this.control = new Int32Array(buffer, 0, 3);
		this.tasks = new Int32Array(buffer, 3 * Int32Array.BYTES_PER_ELEMENT, capacity);
	}

	public get buffer(): SharedArrayBuffer {
		return this.control.buffer as SharedArrayBuffer;
	}

	public push(task: number): boolean {
		this.lock();

		try {
			const head = Atomics.load(this.control, 1);
			const tail = Atomics.load(this.control, 2);
			const size = (tail - head) >>> 0;

			if (size >= this.capacity)
				return false;

			this.tasks[tail & (this.capacity - 1)] = task;
			Atomics.store(this.control, 2, (tail + 1) | 0);

			return true;
		} finally {
			this.unlock();
		}
	}

	public pop(): number {
		this.lock();

		try {
			const head = Atomics.load(this.control, 1);
			const tail = Atomics.load(this.control, 2);

			if (head === tail)
				return -1;

			const nextTail = (tail - 1) | 0;
			const task = this.tasks[nextTail & (this.capacity - 1)];

			Atomics.store(this.control, 2, nextTail);

			if (nextTail === head) {
				Atomics.store(this.control, 1, (head + 1) | 0);
				Atomics.store(this.control, 2, (head + 1) | 0);
			}

			return task!;
		} finally {
			this.unlock();
		}
	}

	public steal(): number {
		this.lock();

		try {
			const head = Atomics.load(this.control, 1);
			const tail = Atomics.load(this.control, 2);

			if (head === tail)
				return -1;

			const task = this.tasks[head & (this.capacity - 1)];
			Atomics.store(this.control, 1, (head + 1) | 0);

			return task!;
		} finally {
			this.unlock();
		}
	}

	public get size(): number {
		const head = Atomics.load(this.control, 1);
		const tail = Atomics.load(this.control, 2);

		return (tail - head) >>> 0;
	}

	private lock() {
		while (Atomics.compareExchange(this.control, 0, 0, 1) !== 0)
			Atomics.wait(this.control, 0, 1);
	}

	private unlock() {
		Atomics.store(this.control, 0, 0);
		Atomics.notify(this.control, 0, 1);
	}
}
