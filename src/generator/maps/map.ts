import { state, store } from "../../state";
import type { WorldParams } from "../params";

@store
export abstract class MapGenerator {
	public readonly width: number;
	public readonly height: number;
	public readonly data: Float32Array;

	@state
	private _generationId: number = 0;

	public get generationId() {
		return this._generationId;
	}

	protected readonly world: WorldParams

	public constructor(world: WorldParams) {
		this.world = world;
		this.width = Math.ceil(world.size.x);
		this.height = Math.ceil(world.size.z);

		this.data = new Float32Array(this.width * this.height);
	}

	public generate(regenerate: boolean = false): void {
		if (!regenerate && this.generationId)
			return;
		this.clear();
		this.onGenerate();
		this._generationId++;
	}

	public abstract onGenerate(): void;

	public get(x: number, z: number): number {
		if (x < 0 || x >= this.width || z < 0 || z >= this.height)
			return 0;

		return this.data[z * this.width + x]!;
	}

	protected set(x: number, z: number, value: number): void {
		this.data[z * this.width + x] = value;
	}

	protected clear(): void {
		this.data.fill(0);
	}

	public dispose() { }
}

export type MapGeneratorType<T extends MapGenerator = MapGenerator> = new (worldParams: WorldParams) => T;