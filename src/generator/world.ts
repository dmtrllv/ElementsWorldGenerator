import { state, store } from "../state";
import { Generator } from "./generator";
import type { WorldParams } from "./params/world-params";

@store
export class World {
	@state
	public readonly params: WorldParams;

	public readonly generator: Generator;

	public constructor(params: WorldParams) {
		this.params = params;
		this.generator = new Generator(this);
	}

	public dispose() {

	}
}
