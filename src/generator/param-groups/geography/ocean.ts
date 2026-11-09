import { Float, Scalar } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Ocean",
	description: "Controls the distribution and shape of ocean regions, including ocean basins and continental shelves."
})
export class OceanParams extends ParamGroup<OceanParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "Controls variation in ocean basin depth. Scale is measured in metres.",
		default: {
			seedOffset: 0,
			scale: 600,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 4
		}
	})
	public readonly distribution!: Scalar;

	@param(Scalar, {
		name: "Shelf",
		description: "Controls local variation in continental shelf width. Scale is measured in metres.",
		default: {
			seedOffset: 100,
			scale: 48,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 4
		}
	})
	public readonly shelf!: Scalar;

	@param(Float, {
		name: "Shelf Width",
		description: "Controls the distance from the coastline over which the ocean floor transitions from shallow water to deep ocean, measured in metres.",
		default: 72
	})
	public readonly shelfWidth!: Float;
}
