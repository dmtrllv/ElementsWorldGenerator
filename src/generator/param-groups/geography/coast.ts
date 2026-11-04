import { Curve, Float } from "../../params";
import { group, param, ParamGroup } from "./../param-group";

@group({
	name: "Coast",
	description: "Controls the transition between ocean and land, including the width and falloff of coastal influence. Coastlines are derived from ocean boundaries; inland water bodies such as lakes are handled separately."
})
export class CoastParams extends ParamGroup<CoastParams> {
	@param(Float, {
		name: "Transition Width",
		description: "Maximum distance inland over which coastal influence extends, measured from the ocean boundary.",
		default: 1
	})
	public readonly transitionWidth!: Float;

	@param(Curve, {
		name: "Falloff",
		description: "Controls how coastal influence decreases with distance from the ocean boundary. The curve maps normalized coastal distance to influence strength.",
		default: {
			interpolation: "monotone-cubic",
			points: Curve.defaultPoints
		}
	})
	public readonly falloff!: Curve;
}