import { Float } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Elevation",
	description: "Controls the base elevation of continental landmasses and ocean floors."
})
export class ElevationParams extends ParamGroup<ElevationParams> {
	@param(Float, {
		name: "Land Elevation",
		description: "Maximum base elevation of continental terrain above sea level, before terrain features are applied.",
		default: 2000
	})
	public readonly landElevation!: Float;

	@param(Float, {
		name: "Ocean Depth",
		description: "Maximum base depth of ocean floors below sea level.",
		default: 6000
	})
	public readonly oceanDepth!: Float;

	@param(Float, {
		name: "Mountain Height",
		description: "Maximum elevation added by mountain regions above the base terrain.",
		default: 3000
	})
	public readonly mountainHeight!: Float;
}