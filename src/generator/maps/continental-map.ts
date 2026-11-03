import { ParamMap } from "../param-map";

export class ContinentalMap extends ParamMap<number> {
	private _buffer?: Float32Array | null = null;

	public get buffer() {
		if (!this._buffer) {
			this._buffer = this.generate()
		}
		return this._buffer
	}

	private generate() {
		const worldParams = this.generator.worldParams;
		const params = worldParams.geography.continental;
		const size = worldParams.size;
		const s = size.x * size.z;
		const buffer = new Float32Array(s);
		
		const width = worldParams.size.x;
		const height = worldParams.size.z;
		
		const min = worldParams.geography.continental.normalization.min;
		const max = worldParams.geography.continental.normalization.max;

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const warp = params.warp.get(x, z);

				const nx = x + warp.x * params.warpStrength.state;
				const nz = z + warp.y * params.warpStrength.state;

				const value = params.shape.evaluate(params.distribution.get(nx, nz));
				const normalized = (value - min) / (max - min);
				buffer[z * width + x] = normalized;
			}
		}
		console.log(worldParams.geography.continental, buffer);
		return buffer;
	}

	public override get(x: number, z: number): number {
		return this.buffer[z * this.generator.worldParams.size.x + x]!
	}
}