export class SharedArena {
	private offset = 0;
	private readonly buffer: SharedArrayBuffer;
	private readonly maxCapacity: number;

	public constructor(buffer: SharedArrayBuffer, maxCapacity: number = buffer.byteLength) {
		this.buffer = buffer;
		this.maxCapacity = maxCapacity;
	}

	public static create(capacity: number, maxCapacity: number = 1024 * 1024 * 1024): SharedArena {
		if (!Number.isSafeInteger(capacity) || capacity <= 0)
			throw new RangeError("Arena capacity must be a positive safe integer.");

		if (!Number.isSafeInteger(maxCapacity) || maxCapacity < capacity)
			throw new RangeError("Arena maximum capacity must be at least its initial capacity.");

		let buffer: SharedArrayBuffer;

		try {
			buffer = new SharedArrayBuffer(capacity, { maxByteLength: maxCapacity });
		} catch {
			buffer = new SharedArrayBuffer(capacity);
		}

		return new SharedArena(buffer, maxCapacity);
	}


	public allocate(byteLength: number, alignment: number = 8): number {
		if (!Number.isSafeInteger(byteLength) || byteLength < 0)
			throw new RangeError("Allocation size must be a non-negative safe integer.");

		if (!Number.isSafeInteger(alignment) || alignment <= 0)
			throw new RangeError("Alignment must be a positive safe integer.");

		const offset = Math.ceil(this.offset / alignment) * alignment;
		const end = offset + byteLength;

		if (end > this.maxCapacity)
			throw new RangeError("Shared arena maximum capacity exceeded.");

		if (end > this.buffer.byteLength) {
			const grow = (this.buffer as SharedArrayBuffer & { grow?: (size: number) => void }).grow;

			if (!grow)
				throw new RangeError("Shared arena exhausted and growable SharedArrayBuffer is unavailable.");

			let capacity = this.buffer.byteLength;

			while (capacity < end)
				capacity = Math.min(this.maxCapacity, Math.max(capacity * 2, end));

			grow.call(this.buffer, capacity);
		}

		this.offset = end;

		return offset;
	}


	public view(offset: number, byteLength: number): Uint8Array {
		if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(byteLength) || byteLength < 0 || offset + byteLength > this.buffer.byteLength)
			throw new RangeError("Invalid arena view.");

		return new Uint8Array(this.buffer, offset, byteLength);
	}

	public reset(): void {
		this.offset = 0;
	}

	public get bufferRef(): SharedArrayBuffer {
		return this.buffer;
	}

	public get used(): number {
		return this.offset;
	}

	public get capacity(): number {
		return this.buffer.byteLength;
	}

	public get remaining(): number {
		return this.buffer.byteLength - this.offset;
	}
}
