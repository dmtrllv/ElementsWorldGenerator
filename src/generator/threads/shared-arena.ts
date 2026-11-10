export class SharedArena {
	private offset = 0;
	private readonly buffer: SharedArrayBuffer;
	
	public constructor(buffer: SharedArrayBuffer) {
		this.buffer = buffer;
	}

	public static create(capacity: number): SharedArena {
		if (!Number.isSafeInteger(capacity) || capacity <= 0)
			throw new RangeError("Arena capacity must be a positive safe integer.");

		return new SharedArena(new SharedArrayBuffer(capacity));
	}

	public allocate(byteLength: number, alignment: number = 8): number {
		if (!Number.isSafeInteger(byteLength) || byteLength < 0)
			throw new RangeError("Allocation size must be a non-negative safe integer.");

		if (!Number.isSafeInteger(alignment) || alignment <= 0)
			throw new RangeError("Alignment must be a positive safe integer.");

		const offset = Math.ceil(this.offset / alignment) * alignment;
		const end = offset + byteLength;

		if (end > this.buffer.byteLength)
			throw new RangeError(`Shared arena exhausted: requested ${byteLength} bytes, ${this.buffer.byteLength - this.offset} bytes remaining.`);

		this.offset = end;

		return offset;
	}

	public view(offset: number, byteLength: number): Uint8Array {
		if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(byteLength) || byteLength < 0 || offset + byteLength > this.buffer.byteLength)
			throw new RangeError("Invalid arena view.");

		return new Uint8Array(this.buffer, offset, byteLength);
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
