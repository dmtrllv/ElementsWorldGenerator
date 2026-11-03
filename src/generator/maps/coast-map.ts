import { ParamMap } from "../param-map";
import { ContinentalMap } from "./continental-map";

export class CoastMap extends ParamMap<number> {
	private readonly params = this.worldParams.geography.coastParams;
	private _buffer: Float32Array | null = null;

	public generate(overwrite: boolean = false): void {
		if (this._buffer && !overwrite)
			return;

		const width = this.worldParams.size.x;
		const height = this.worldParams.size.z;
		const size = width * height;
		const continental = this.generator.getMap(ContinentalMap);

		const distance = new Float32Array(size);
		const boundary = new Uint8Array(size);

		const maxDistance = this.params.transitionWitdth.state;
		const diagonal = Math.SQRT2;

		distance.fill(Infinity);

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;
				const land = continental.get(x, z) >= 0.5;

				const left = x > 0 ? continental.get(x - 1, z) >= 0.5 : land;
				const right = x < width - 1 ? continental.get(x + 1, z) >= 0.5 : land;
				const top = z > 0 ? continental.get(x, z - 1) >= 0.5 : land;
				const bottom = z < height - 1 ? continental.get(x, z + 1) >= 0.5 : land;

				if (land !== left || land !== right || land !== top || land !== bottom) {
					boundary[index] = 1;
					distance[index] = 0;
				}
			}
		}

		// Forward pass.
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;
				let value = distance[index]!;

				if (x > 0)
					value = Math.min(value, distance[index - 1]! + 1);

				if (z > 0)
					value = Math.min(value, distance[index - width]! + 1);

				if (x > 0 && z > 0)
					value = Math.min(value, distance[index - width - 1]! + diagonal);

				if (x < width - 1 && z > 0)
					value = Math.min(value, distance[index - width + 1]! + diagonal);

				distance[index] = value;
			}
		}

		// Backward pass.
		for (let z = height - 1; z >= 0; z--) {
			for (let x = width - 1; x >= 0; x--) {
				const index = z * width + x;
				let value = distance[index]!;

				if (x < width - 1)
					value = Math.min(value, distance[index + 1]! + 1);

				if (z < height - 1)
					value = Math.min(value, distance[index + width]! + 1);

				if (x < width - 1 && z < height - 1)
					value = Math.min(value, distance[index + width + 1]! + diagonal);

				if (x > 0 && z < height - 1)
					value = Math.min(value, distance[index + width - 1]! + diagonal);

				distance[index] = value;
			}
		}

		const buffer = new Float32Array(size);

		for (let i = 0; i < size; i++) {
			const normalized = Math.max(0, Math.min(1, distance[i]! / maxDistance));
			buffer[i] = this.params.falloff.evaluate(1 - normalized);
		}

		this._buffer = buffer;
	}

	public override get(x: number, z: number): number {
		this.generate();
		return this._buffer![z * this.worldParams.size.x + x]!;
	}
}