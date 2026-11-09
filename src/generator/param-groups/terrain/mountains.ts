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
			scale: 0.0005,
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
			scale: 0.002,
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
			scale: 0.001,
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
		default: 500
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "Normalization",
		description: "Defines the output range of mountain elevation.",
		default: [0, 1]
	})
	public readonly normalization!: Range;

	@param(Curve, {
		name: "Falloff",
		description: "Controls the transition from mountain regions into surrounding terrain.",
		default: {
			points: Curve.defaultPoints,
			interpolation: "monotone-cubic"
		}
	})
	public readonly falloff!: Curve;
}