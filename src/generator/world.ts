import { createObservable, observable, subscribeDeep, type Unsubscriber } from "../reactive";
import { Generator } from "./generator";
import { WorldParams, type WorldParamProps } from "./world-params";

@observable
export class World {
	public readonly worldParams: WorldParams;

	@observable
	public generator: Generator;
	
	private readonly unsubscribeWorldParams: Unsubscriber;

	public constructor(seed: number, worldParamProps: WorldParamProps) {
		this.worldParams = new WorldParams(seed, worldParamProps);
		
		const world = createObservable(this);

		this.generator = createObservable(new Generator(this.worldParams.snapshot()));
		this.unsubscribeWorldParams = subscribeDeep(this.worldParams, () => {
			world.generator = createObservable(new Generator(this.worldParams.snapshot()));
		});
	}

	public dispose() {
		this.generator.dispose();
		this.unsubscribeWorldParams();
	}
}