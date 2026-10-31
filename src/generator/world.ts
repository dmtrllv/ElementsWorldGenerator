import { Vector3 } from "three";
import { store } from "../state";
import { param } from "./parameters";
import { Scalar } from "./scalar";

export class World {
	public readonly params: WorldParams;

	public constructor(seed: number) {
		this.params = new WorldParams(seed);
	}
}

@store
export class WorldParams {
	@param()
	public _seed: number;

	public get seed() {
		return this._seed;
	}

	public set seed(seed: number) {
		this._seed = seed;
	}

	private readonly seedChangeListeners: SeedChangeListener[] = [];

	@param()
	public size: Vector3 = new Vector3(512, 64, 512);

	@param()
	public chunkSize: number = 16;

	public constructor(seed: number) {
		this._seed = seed;
	}

	public onSeedChange(handler: SeedChangeListener) {
		this.seedChangeListeners.push(handler);
		return () => {
			const index = this.seedChangeListeners.indexOf(handler);
			if (index > -1)
				this.seedChangeListeners.splice(index, 1);
		};
	}
}

export type SeedChangeListener = (newSeed: number) => void;

@store
export class LatitudeParams {
	@param()
	public axis: "x" | "y" = "x";

	@param()
	public stepDistance: number = 0;

	@param()
	public offset: number = 0;

	@param()
	public readonly distortion: Scalar;

	public constructor(world: WorldParams) {
		this.distortion = new Scalar("latitude", world);
	}
}