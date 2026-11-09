import { Float } from "../../params";
import { group, param, ParamGroup } from "../param-group";

@group({
	name: "Sea Level",
	description: "Controls the global reference elevation of the world's oceans."
})
export class SeaLevelParams extends ParamGroup<SeaLevelParams> {
	@param(Float, {
		name: "Sea Level",
		description: "The elevation at which ocean water meets the terrain, measured in metres.",
		default: 0
	})
	public readonly seaLevel!: Float;
}