import { observable, state } from "../state";
import { WorldParams, type WorldParamProps } from "./world-params";

@observable
export class World {
	@state
	public readonly worldParams: WorldParams;
	
	public constructor(seed: number, worldParamProps: WorldParamProps) {
		this.worldParams = new WorldParams(seed, worldParamProps);
	}
}