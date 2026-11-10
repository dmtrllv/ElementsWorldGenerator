import { Float } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Elevation",
	description: "Controls the vertical elevation of continental terrain, ocean floors and mountain regions. All values are measured in metres."
})
export class ElevationParams extends ParamGroup<ElevationParams> {
	@param(Float, {
		name: "Land Elevation",
		description: "Maximum base elevation of continental terrain above sea level.",
		default: 30
	})
	public readonly landElevation!: Float;

	@param(Float, {
		name: "Ocean Depth",
		description: "Maximum depth of ocean floors below sea level.",
		default: 400
	})
	public readonly oceanDepth!: Float;

	@param(Float, {
		name: "Mountain Height",
		description: "Maximum additional elevation contributed by mountain regions.",
		default: 800
	})
	public readonly mountainHeight!: Float;

	@param(Float, {
		name: "Coastal Elevation",
		description: "Fraction of normal base land elevation retained at maximum coastal influence.",
		default: 0.15
	})
	public readonly coastalElevation!: Float;
}
