import { Curve, Float, Range, Scalar, VectorField } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Continental",
	description: ""
})
export class ContinentalParams extends ParamGroup<ContinentalParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "",
		default: {
			seedOffset: 0,
			scale: 400,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
		}
	})
	public readonly distribution!: Scalar;

	@param(Curve, {
		name: "Shape",
		description: "",
		default: {
			interpolation: "monotone-cubic",
			points: Curve.defaultPoints
		}
	})
	public readonly shape!: Curve;

	@param(VectorField, {
		name: "Warp",
		description: "",
		default: {
			seedOffset: 0,
			scale: 200,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
		}
	})
	public readonly warp!: VectorField;

	@param(Float, {
		name: "Warp Strength",
		description: "",
		default: 40
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "normalization",
		description: "",
		default: [-1, 1]
	})
	public readonly normalization!: Range;

	public override preview(buffer: Uint32Array): void {

		const width = this.worldParams.size.x;
		const height = this.worldParams.size.z;

		const min = this.normalization.min;
		const max = this.normalization.max;

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const warp = this.warp.get(x, z);

				const nx = x + warp.x * this.warpStrength.state;
				const nz = z + warp.y * this.warpStrength.state;

				const noise = this.distribution.get(nx, nz);
				const normalized = (noise - min) / (max - min);
				const value = this.shape.evaluate(normalized);
				const color = Math.round(Math.max(0, Math.min(1, value)) * 255);

				buffer[z * width + x] = 0xff000000 | color << 16 | color << 8 | color;
			}
		}
	}
}