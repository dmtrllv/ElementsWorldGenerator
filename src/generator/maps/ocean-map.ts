import { dependency, ParamMap } from "./param-map";
import { ContinentalMap } from "./continental-map";

export class OceanMap extends ParamMap<number> {
	@dependency(ContinentalMap)
	public readonly continental!: ContinentalMap;

	private readonly params = this.worldParams.geography.oceanParams;
	private _buffer: Float32Array | null = null;

	public generate(overwrite: boolean = false): void {
		if (this._buffer && !overwrite)
			return;

		const width = this.worldParams.size.x;
		const height = this.worldParams.size.z;

		const buffer = new Float32Array(width * height);

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const value = this.continental.get(x, z);

				if (value >= 0.5) {
					buffer[z * width + x] = 0;
					continue;
				}

				const oceanicness = 1 - value * 2;
				const distribution = (this.params.distribution.get(x, z) + 1) * 0.5;
				const shelf = (this.params.shelf.get(x, z) + 1) * 0.5;

				const variation = distribution * (1 - shelf * oceanicness);
				buffer[z * width + x] = Math.max(0, Math.min(1, oceanicness * variation));
			}
		}

		this._buffer = buffer;
	}

	public override get(x: number, z: number): number {
		this.generate();
		return this._buffer![z * this.worldParams.size.x + x]!;
	}

	public override dispose(): void {
		this._buffer = null;
	}
}