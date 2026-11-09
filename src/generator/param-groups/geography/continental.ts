import { Curve, Float, Range, Scalar, VectorField } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Continental",
	description: "Controls the distribution and shape of continental landmasses, including their large-scale boundaries and geographical irregularities."
})
export class ContinentalParams extends ParamGroup<ContinentalParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution of continental regions, defining the large-scale placement and extent of landmasses.",
		default: {
			seedOffset: 0,
			scale: 250000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
		}
	})
	public readonly distribution!: Scalar;

	@param(Curve, {
		name: "Shape",
		description: "Controls how the distribution values translate into continental regions, influencing their overall size, shape, and boundaries.",
		default: {
			interpolation: "monotone-cubic",
			points: [
				{ x: 0, y: 0 },
				{ x: 0.35, y: 0 },
				{ x: 0.5, y: 0.5 },
				{ x: 0.65, y: 1 },
				{ x: 1, y: 1 }
			]
		}
	})
	public readonly shape!: Curve;

	@param(VectorField, {
		name: "Warp",
		description: "Defines spatial distortion applied to continental distribution, introducing irregularities and variation into landmass boundaries.",
		default: {
			seedOffset: 100,
			scale: 100000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
		}
	})
	public readonly warp!: VectorField;

	@param(Float, {
		name: "Warp Strength",
		description: "Controls the intensity of spatial distortion applied by the warp field.",
		default: 3000000
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "Normalization",
		description: "Defines the output range used to normalize continental distribution values.",
		default: [-1, 1]
	})
	public readonly normalization!: Range;
}