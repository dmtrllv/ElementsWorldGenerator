import { Curve, Float, Range, Scalar, VectorField } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Hills",
	description: "Controls the distribution, shape and elevation of rolling hill regions."
})
export class HillParams extends ParamGroup<HillParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution and frequency of hill regions. Scale is measured in metres.",
		default: {
			seedOffset: 0,
			scale: 1200,
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
		description: "Controls the internal elevation variation and roundness of hills. Scale is measured in metres.",
		default: {
			seedOffset: 100,
			scale: 180,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 4,
			relativeScale: false,
		}
	})
	public readonly shape!: Scalar;

	@param(VectorField, {
		name: "Warp",
		description: "Distorts hill coordinates to create irregular formations. Scale is measured in metres.",
		default: {
			seedOffset: 200,
			scale: 400,
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
		default: 80
	})
	public readonly warpStrength!: Float;

	@param(Range, {
		name: "Normalization",
		description: "Defines the distribution range used to normalize hill noise.",
		default: [-1, 1]
	})
	public readonly normalization!: Range;

	@param(Float, {
		name: "Height",
		description: "Maximum additional elevation contributed by hills, measured in metres.",
		default: 18,
		options: {
			min: 0,
			max: 100,
			step: 0.5
		}
	})
	public readonly height!: Float;

	@param(Curve, {
		name: "Falloff",
		description: "Controls how hill regions transition into surrounding terrain.",
		default: {
			interpolation: "monotone-cubic",
			points: [
				{ x: 0, y: 0 },
				{ x: 0.35, y: 0 },
				{ x: 0.5, y: 0.15 },
				{ x: 0.7, y: 0.75 },
				{ x: 0.85, y: 1 },
				{ x: 1, y: 1 }
			]
		}
	})
	public readonly falloff!: Curve;
}
