import { Scalar } from "../params";
import { group, param, ParamGroup } from "./param-group";

@group({
	name: "Ocean",
	description: ""
})
export class OceanParams extends ParamGroup<OceanParams> {
	@param(Scalar, {
		name: "Distribution",
		description: "",
		default: {
			seedOffset: 0,
			scale: 400,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
		}
	})
	public readonly distribution!: Scalar;

	@param(Scalar, {
		name: "Shelf",
		description: "",
		default: {
			seedOffset: 0,
			scale: 400,
			strength: 1,
			persistence: 0.5,
			lacunarity: 2,
			octaves: 3,
		}
	})
	public readonly shelf!: Scalar;
}