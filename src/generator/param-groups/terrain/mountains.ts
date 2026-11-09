import { Scalar, Curve, Float, VectorField, Range } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Mountains",
	description: "Controls the distribution, shape and elevation of mountain regions."
})
export class MountainParams extends ParamGroup<MountainParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution and frequency of mountain regions.",
		default: {
			seedOffset: 0,
			scale: 100000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 4,
		}
	})
	public readonly distribution!: Scalar;

	@param(Scalar, {
		name: "Shape",
		description: "Controls the internal elevation variation of mountain regions.",
		default: {
			seedOffset: 100,
			scale: 12000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 5,
		}
	})
	public readonly shape!: Scalar;

	@param(VectorField, {
		name: "Warp",
		description: "Distorts the noise coordinates to create irregular mountain formations.",
		default: {
			seedOffset: 200,
			scale: 30000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
		}
	})
	public readonly warp!: VectorField;

	@param(Float, {
		name: "Warp Strength",
		description: "Controls the amount of coordinate distortion.",
		default: 15000
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "Normalization",
		description: "Defines the input range used to normalize mountain distribution.",
		default: [-1, 1]
	})
	public readonly normalization!: Range;

	@param(Curve, {
		name: "Falloff",
		description: "Controls the transition from mountain regions into surrounding terrain.",
		default: {
			points: [
				{ x: 0, y: 0 },
				{ x: 0.35, y: 0 },
				{ x: 0.55, y: 0.25 },
				{ x: 0.75, y: 0.8 },
				{ x: 1, y: 1 }
			],
			interpolation: "monotone-cubic"
		}
	})
	public readonly falloff!: Curve;
}