import { ParamMap } from "./param-map";

export class ContinentalMap extends ParamMap<number> {
	private _buffer?: Float32Array | null = null;

	private readonly params = this.worldParams.geography.continental;

	public generate(ovewrite: boolean = false) {
		if (this._buffer && !ovewrite) {
			return;
		}

		const size = this.worldParams.size;
		const s = size.x * size.z;
		this._buffer = new Float32Array(s);

		const width = this.worldParams.size.x;
		const height = this.worldParams.size.z;

		const min = this.params.normalization.min;
		const max = this.params.normalization.max;

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const warp = this.params.warp.get(x, z);

				const nx = x + warp.x * this.params.warpStrength.state;
				const nz = z + warp.y * this.params.warpStrength.state;

				const noise = this.params.distribution.get(nx, nz);
				const normalized = (noise - min) / (max - min);
				const value = this.params.shape.evaluate(normalized);
				this._buffer[z * width + x] = value;
			}
		}
	}

	public override get(x: number, z: number): number {
		this.generate();
		return this._buffer![z * this.generator.worldParams.size.x + x]!
	}

	public override dispose(): void {
		this._buffer = null;
	}
}