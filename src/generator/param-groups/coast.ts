import { Curve, Float } from "../params";
import { group, param, ParamGroup } from "./param-group";

@group({
	name: "Coast",
	description: ""
})
export class CoastParams extends ParamGroup<CoastParams> {
	@param(Float, {
		name: "Transition Width",
		description: "",
		default: 1
	})
	public readonly transitionWitdth!: Float;

	@param(Float, {
		name: "Distance",
		description: "",
		default: 1
	})
	public readonly distance!: Float;

	@param(Curve, {
		name: "Falloff",
		description: "",
		default: {
			interpolation: "monotone-cubic",
			points: Curve.defaultPoints
		}
	})
	public readonly falloff!: Curve;
}