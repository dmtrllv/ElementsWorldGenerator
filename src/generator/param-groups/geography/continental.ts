import { Curve, Float, Range, Scalar, VectorField } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Continental",
	description: "Controls the distribution and shape of continental landmasses, including their large-scale boundaries and geographical irregularities."
})
export class ContinentalParams extends ParamGroup<ContinentalParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution of continental regions. Scale is measured in metres.",
		default: {
			seedOffset: 0,
			scale: 1000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
			relativeScale: false,
		}
	})
	public readonly distribution!: Scalar;

	@param(Curve, {
		name: "Shape",
		description: "Controls how distribution values translate into continental regions.",
		default: {
			interpolation: "monotone-cubic",
			points: [
				{ x: 0, y: 0 },
				{ x: 0.05, y: 0 },
				{ x: 0.95, y: 1 },
				{ x: 1, y: 1 }
			]
		}
	})
	public readonly shape!: Curve;

	@param(VectorField, {
		name: "Warp",
		description: "Defines spatial distortion applied to continental distribution. Scale is measured in metres.",
		default: {
			seedOffset: 100,
			scale: 180,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
			relativeScale: false,
		}
	})
	public readonly warp!: VectorField;

	@param(Float, {
		name: "Warp Strength",
		description: "Maximum coordinate displacement caused by the warp field, measured in metres.",
		default: 60
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "Normalization",
		description: "Defines the distribution range used to normalize continental noise.",
		default: [-1, 1]
	})
	public readonly normalization!: Range;

	@param(Float, { 
		name: "Land Coverage",
		description: "Defines how much of the world will be covered by land",
		default: 0.35,
		options: {
			step: 0.005,
			min: 0.005,
			max: 1,
		}
	})
	public landCoverage!: Float;
}
