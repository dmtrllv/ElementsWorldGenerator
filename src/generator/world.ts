import { createObservable, observable, subscribeDeep, type Unsubscriber } from "../reactive";
import { ChunkManager } from "./chunk-manager";
import { Generator } from "./generator";
import { WorldParams, type WorldParamProps } from "./world-params";

@observable
export class World {
	public readonly worldParams: WorldParams;

	@observable
	public generator: Generator;

	@observable
	public chunkManager: ChunkManager;

	private generation: number;

	private readonly unsubscribeWorldParams: Unsubscriber;

	public constructor(seed: number, worldParamProps: WorldParamProps) {
		this.generation = 0;
		this.worldParams = new WorldParams(seed, worldParamProps);

		const world = createObservable(this);
		const snapshot = this.worldParams.snapshot();

		this.generator = createObservable(new Generator(this.generation, snapshot));
		this.chunkManager = new ChunkManager(this.generator);

		this.unsubscribeWorldParams = subscribeDeep(this.worldParams, () => {
			world.chunkManager.dispose();
			world.generator.dispose();

			world.generator = createObservable(new Generator(++this.generation, this.worldParams.snapshot()));
			world.chunkManager = new ChunkManager(world.generator);
		});
	}

	public dispose() {
		this.chunkManager.dispose();
		this.generator.dispose();
		this.unsubscribeWorldParams();
	}
}
