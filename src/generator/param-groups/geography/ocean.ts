import { Scalar } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Ocean",
	description: "Controls the distribution and shape of ocean regions, including the formation of ocean basins and the transition from deep ocean to continental shelves."
})
export class OceanParams extends ParamGroup<OceanParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Determines the spatial distribution of ocean regions, controlling where oceans form and how their boundaries and shapes are defined.",
		default: {
			seedOffset: 0,
			scale: 100000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 4,
		}
	})
	public readonly distribution!: Scalar;

	@param(Scalar, {
		name: "Shelf",
		description: "Controls the shape and extent of continental shelves, defining the transition from shallow coastal waters to deep ocean basins.",
		default: {
			seedOffset: 100,
			scale: 12000,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 4,
		}
	})
	public readonly shelf!: Scalar;
}