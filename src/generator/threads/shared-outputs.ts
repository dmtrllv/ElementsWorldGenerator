import type { SampleRegion } from "../maps";

export type SharedOutput = {
	readonly mapId: number;
	readonly workerId: number;
	readonly offset: number;
	readonly byteLength: number;
	readonly samples: SampleRegion;
};

export class SharedOutputs {
	private static readonly VALUE_SIZE = 9;

	private readonly states: Int32Array;
	private readonly values: Float64Array;
	private readonly taskCapacity: number;
	private readonly maxOutputs: number;

	public constructor(buffer: SharedArrayBuffer, taskCapacity: number, maxOutputs: number) {
		this.taskCapacity = taskCapacity;
		this.maxOutputs = maxOutputs;

		const count = taskCapacity * maxOutputs;
		const stateBytes = count * Int32Array.BYTES_PER_ELEMENT;
		const valueOffset = Math.ceil(stateBytes / Float64Array.BYTES_PER_ELEMENT) * Float64Array.BYTES_PER_ELEMENT;
		const valueCount = count * SharedOutputs.VALUE_SIZE;

		if (buffer.byteLength !== valueOffset + valueCount * Float64Array.BYTES_PER_ELEMENT)
			throw new RangeError("Invalid shared output buffer size.");

		this.states = new Int32Array(buffer, 0, count);
		this.values = new Float64Array(buffer, valueOffset, valueCount);
	}

	public static create(taskCapacity: number, maxOutputs: number): SharedOutputs {
		const count = taskCapacity * maxOutputs;
		const stateBytes = count * Int32Array.BYTES_PER_ELEMENT;
		const valueOffset = Math.ceil(stateBytes / Float64Array.BYTES_PER_ELEMENT) * Float64Array.BYTES_PER_ELEMENT;
		const valueBytes = count * SharedOutputs.VALUE_SIZE * Float64Array.BYTES_PER_ELEMENT;

		return new SharedOutputs(new SharedArrayBuffer(valueOffset + valueBytes), taskCapacity, maxOutputs);
	}

	public publish(taskId: number, outputIndex: number, output: SharedOutput): void {
		const index = this.getIndex(taskId, outputIndex);

		if (Atomics.load(this.states, index) !== 0)
			throw new Error(`Output ${outputIndex} for task ${taskId} has already been published.`);

		const base = index * SharedOutputs.VALUE_SIZE;

		this.values[base] = output.mapId;
		this.values[base + 1] = output.workerId;
		this.values[base + 2] = output.offset;
		this.values[base + 3] = output.byteLength;
		this.values[base + 4] = output.samples.x;
		this.values[base + 5] = output.samples.z;
		this.values[base + 6] = output.samples.width;
		this.values[base + 7] = output.samples.height;
		this.values[base + 8] = output.samples.resolution;

		Atomics.store(this.states, index, 1);
	}

	public get(taskId: number, outputIndex: number): SharedOutput | null {
		const index = this.getIndex(taskId, outputIndex);

		if (Atomics.load(this.states, index) !== 1)
			return null;

		const base = index * SharedOutputs.VALUE_SIZE;

		return {
			mapId: this.values[base]!,
			workerId: this.values[base + 1]!,
			offset: this.values[base + 2]!,
			byteLength: this.values[base + 3]!,
			samples: {
				x: this.values[base + 4]!,
				z: this.values[base + 5]!,
				width: this.values[base + 6]!,
				height: this.values[base + 7]!,
				resolution: this.values[base + 8]!
			}
		};
	}

	public reset(): void {
		this.states.fill(0);
	}

	public get buffer(): SharedArrayBuffer {
		return this.states.buffer as SharedArrayBuffer;
	}

	private getIndex(taskId: number, outputIndex: number): number {
		if (!Number.isSafeInteger(taskId) || taskId <= 0 || taskId > this.taskCapacity)
			throw new RangeError(`Invalid task ID ${taskId}.`);

		if (!Number.isSafeInteger(outputIndex) || outputIndex < 0 || outputIndex >= this.maxOutputs)
			throw new RangeError(`Invalid output index ${outputIndex}.`);

		return (taskId - 1) * this.maxOutputs + outputIndex;
	}
}
