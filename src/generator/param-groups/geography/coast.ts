import { Curve, Float } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Coast",
	description: "Controls the transition between ocean and land, including the width and falloff of coastal influence."
})
export class CoastParams extends ParamGroup<CoastParams> {
	@param(Float, {
		name: "Transition Width",
		description: "Maximum distance inland over which coastal influence extends, measured in metres.",
		default: 24
	})
	public readonly transitionWidth!: Float;

	@param(Curve, {
		name: "Falloff",
		description: "Controls how coastal influence decreases with distance from the ocean boundary.",
		default: {
			interpolation: "monotone-cubic",
			points: [
				{ x: 0, y: 1 },
				{ x: 0.2, y: 0.8 },
				{ x: 0.5, y: 0.35 },
				{ x: 0.8, y: 0.08 },
				{ x: 1, y: 0 }
			]
		}
	})
	public readonly falloff!: Curve;
}
