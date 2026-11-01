import { state, store } from "../../state";
import type { WorldParams } from "../params";
import type { WorldMap } from "./world-map";

@store
export abstract class MapGenerator {
	public width: number;
	public height: number;
	public data: Float32Array;

	@state
	private _generationId: number = 0;

	public get generationId() {
		return this._generationId;
	}

	protected readonly world: WorldParams

	public constructor(worldMap: WorldMap) {
		this.world = worldMap.params;
		this.width = Math.ceil(this.world.size.x);
		this.height = Math.ceil(this.world.size.z);

		this.data = new Float32Array(this.width * this.height);
	}

	public generate(regenerate: boolean = false): void {
		const width = Math.ceil(this.world.size.x);
		const height = Math.ceil(this.world.size.z);

		if (width !== this.width || height !== this.height) {
			this.width = width;
			this.height = height;
			this.data = new Float32Array(width * height);
			regenerate = true;
		}

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

export type MapGeneratorType<T extends MapGenerator = MapGenerator> = new (worldMap: WorldMap) => T;