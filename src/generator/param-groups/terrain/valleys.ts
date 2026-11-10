import { Curve, Float, Scalar, VectorField } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Valleys",
	description: "Controls the distribution, shape and dimensions of valley formations."
})
export class ValleyParams extends ParamGroup<ValleyParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution and frequency of valley formations. Scale is measured in metres.",
		default: {
			seedOffset: 0,
			scale: 2400,
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
		description: "Controls the internal shape and variation of valley formations. Scale is measured in metres.",
		default: {
			seedOffset: 100,
			scale: 300,
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
		description: "Distorts valley coordinates to create irregular and meandering formations. Scale is measured in metres.",
		default: {
			seedOffset: 200,
			scale: 900,
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
		description: "Maximum horizontal displacement caused by the warp field, measured in metres.",
		default: 180
	})
	public readonly warpStrength!: Float;

	@param(Float, {
		name: "Depth",
		description: "Maximum valley depth below the surrounding terrain, measured in metres.",
		default: 20,
		options: {
			min: 0,
			max: 200,
			step: 0.5
		}
	})
	public readonly depth!: Float;

	@param(Float, {
		name: "Width",
		description: "Typical horizontal width of valley formations, measured in metres.",
		default: 120,
		options: {
			min: 4,
			max: 1000,
			step: 1
		}
	})
	public readonly width!: Float;

	@param(Float, {
		name: "Floor Width",
		description: "Controls the relative width of the flatter valley floor.",
		default: 0.25,
		options: {
			min: 0,
			max: 1,
			step: 0.01
		}
	})
	public readonly floorWidth!: Float;

	@param(Curve, {
		name: "Profile",
		description: "Controls the cross-sectional profile from valley floor to surrounding terrain.",
		default: {
			interpolation: "monotone-cubic",
			points: [
				{ x: 0, y: 1 },
				{ x: 0.25, y: 1 },
				{ x: 0.55, y: 0.7 },
				{ x: 0.8, y: 0.15 },
				{ x: 1, y: 0 }
			]
		}
	})
	public readonly profile!: Curve;
}
