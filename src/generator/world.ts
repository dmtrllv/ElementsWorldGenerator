import { createObservable, observable, subscribeDeep, type Unsubscriber } from "../reactive";
import { Generator } from "./generator";
import { WorldParams, type WorldParamProps } from "./world-params";

@observable
export class World {
	public readonly worldParams: WorldParams;

	private _generator: Generator;

	public get generator(): Generator { return this._generator; };
	
	private readonly unsubscribeWorldParams: Unsubscriber;

	public constructor(seed: number, worldParamProps: WorldParamProps) {
		this.worldParams = new WorldParams(seed, worldParamProps);
		this._generator = createObservable(new Generator(this.worldParams.snapshot()));
		this.unsubscribeWorldParams = subscribeDeep(this.worldParams, () => {
			this._generator = new Generator(this.worldParams.snapshot());
		});
	}

	public dispose() {
		this.generator.dispose();
		this.unsubscribeWorldParams();
	}
}