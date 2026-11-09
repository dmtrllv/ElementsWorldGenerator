
import { Scalar, Curve, Float, VectorField, Range } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Mountains",
	description: "Controls the distribution, shape and elevation of mountain regions."
})
export class MountainParams extends ParamGroup<MountainParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution and frequency of mountain regions. Scale is measured in metres.",
		default: {
			seedOffset: 0,
			scale: 1500,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 4
		}
	})
	public readonly distribution!: Scalar;

	@param(Scalar, {
		name: "Shape",
		description: "Controls the internal elevation variation of mountain regions. Scale is measured in metres.",
		default: {
			seedOffset: 200,
			scale: 200,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 5
		}
	})
	public readonly shape!: Scalar;

	@param(VectorField, {
		name: "Warp",
		description: "Distorts the noise coordinates to create irregular mountain formations. Scale is measured in metres.",
		default: {
			seedOffset: 200,
			scale: 80,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3
		}
	})
	public readonly warp!: VectorField;

	@param(Float, {
		name: "Warp Strength",
		description: "Maximum coordinate displacement caused by the warp field, measured in metres.",
		default: 24
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "Normalization",
		description: "Defines the input range used to normalize mountain distribution.",
		default: [-1, 1]
	})
	public readonly normalization!: Range;

	@param(Float, {
		name: "Edge Sharpness",
		description: "Controls how sharply mountain regions transition into surrounding terrain. Higher values create narrower, sharper boundaries.",
		default: 5
	})
	public readonly edgeSharpness!: Float;

	@param(Curve, {
		name: "Falloff",
		description: "Controls the distribution threshold and transition into mountain regions.",
		default: {
			points: [
				{ x: 0, y: 0 },
				{ x: 0.45, y: 0 },
				{ x: 0.55, y: 0.1 },
				{ x: 0.65, y: 0.65 },
				{ x: 0.75, y: 1 },
				{ x: 1, y: 1 }
			],
			interpolation: "monotone-cubic"
		}
	})
	public readonly falloff!: Curve;
}
