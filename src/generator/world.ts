import { WorldParams, type WorldParamProps } from "./world-params";

export class World {
	public readonly worldParams: WorldParams;
	
	public constructor(seed: number, worldParamProps: WorldParamProps) {
		this.worldParams = new WorldParams(seed, worldParamProps);
	}
}