import { Float, Scalar } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Plains",
	description: "Controls the distribution and surface variation of flat and gently rolling terrain."
})
export class PlainParams extends ParamGroup<PlainParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution of plains regions. Scale is measured in metres.",
		default: {
			seedOffset: 0,
			scale: 1800,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
			relativeScale: false,
		}
	})
	public readonly distribution!: Scalar;

	@param(Scalar, {
		name: "Undulation",
		description: "Controls broad elevation changes across plains. Scale is measured in metres.",
		default: {
			seedOffset: 100,
			scale: 600,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
			relativeScale: false,
		}
	})
	public readonly undulation!: Scalar;

	@param(Float, {
		name: "Undulation Strength",
		description: "Maximum elevation variation caused by broad undulations, measured in metres.",
		default: 3,
		options: {
			min: 0,
			max: 30,
			step: 0.1
		}
	})
	public readonly undulationStrength!: Float;

	@param(Scalar, {
		name: "Roughness",
		description: "Controls smaller surface elevation variations. Scale is measured in metres.",
		default: {
			seedOffset: 200,
			scale: 48,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
			relativeScale: false,
		}
	})
	public readonly roughness!: Scalar;

	@param(Float, {
		name: "Roughness Strength",
		description: "Maximum elevation variation caused by surface roughness, measured in metres.",
		default: 0.75,
		options: {
			min: 0,
			max: 10,
			step: 0.05
		}
	})
	public readonly roughnessStrength!: Float;

	@param(Float, {
		name: "Flatness",
		description: "Controls how strongly elevation variations are suppressed. Higher values produce flatter plains.",
		default: 0.85,
		options: {
			min: 0,
			max: 1,
			step: 0.01
		}
	})
	public readonly flatness!: Float;
}
