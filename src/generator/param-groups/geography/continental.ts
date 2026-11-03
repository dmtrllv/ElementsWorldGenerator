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
}