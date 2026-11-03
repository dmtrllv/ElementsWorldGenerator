import { observable, state } from "../state";
import { Generator } from "./generator";
import { WorldParams, type WorldParamProps } from "./world-params";

@observable
export class World {
	@state
	public readonly worldParams: WorldParams;
	
	public readonly generator: Generator;

	public constructor(seed: number, worldParamProps: WorldParamProps) {
		this.worldParams = new WorldParams(seed, worldParamProps);
		this.generator = new Generator(this.worldParams);
	}
}