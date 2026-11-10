import { Curve, Float, Range, Scalar, VectorField } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Plateaus",
	description: "Controls the distribution, elevation and shape of plateau regions."
})
export class PlateauParams extends ParamGroup<PlateauParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution and frequency of plateau regions. Scale is measured in metres.",
		default: {
			seedOffset: 0,
			scale: 3000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
			relativeScale: false,
		}
	})
	public readonly distribution!: Scalar;

	@param(Scalar, {
		name: "Shape",
		description: "Controls elevation variation across plateau surfaces. Scale is measured in metres.",
		default: {
			seedOffset: 100,
			scale: 500,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
			relativeScale: false,
		}
	})
	public readonly shape!: Scalar;

	@param(VectorField, {
		name: "Warp",
		description: "Distorts plateau boundaries to create irregular formations. Scale is measured in metres.",
		default: {
			seedOffset: 200,
			scale: 800,
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
		default: 120
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "Normalization",
		description: "Defines the distribution range used to normalize plateau noise.",
		default: [-1, 1]
	})
	public readonly normalization!: Range;

	@param(Float, {
		name: "Height",
		description: "Maximum additional elevation contributed by plateau regions, measured in metres.",
		default: 40,
		options: {
			min: 0,
			max: 300,
			step: 0.5
		}
	})
	public readonly height!: Float;

	@param(Curve, {
		name: "Falloff",
		description: "Controls the transition between plateau tops and surrounding terrain. Steeper transitions create sharper plateau edges.",
		default: {
			interpolation: "monotone-cubic",
			points: [
				{ x: 0, y: 0 },
				{ x: 0.65, y: 0 },
				{ x: 0.75, y: 0.1 },
				{ x: 0.85, y: 0.85 },
				{ x: 1, y: 1 }
			]
		}
	})
	public readonly falloff!: Curve;
}
