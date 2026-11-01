import type { WorldParams } from "../params";
import type { MapGenerator, MapGeneratorType } from "./map";

export class WorldMap {
	private readonly maps = new Map<MapGeneratorType, MapGenerator>();

	public readonly params: WorldParams;

	public constructor(params: WorldParams) {
		this.params = params;
	}

	public get<T extends MapGenerator>(type: MapGeneratorType<T>): T {
		if (!this.maps.has(type))
			this.maps.set(type, new type(this.params));
		return this.maps.get(type) as T;
	}

	public generate<T extends MapGenerator>(type: MapGeneratorType<T>, regenerate: boolean = false): T {
		const map = this.get(type);
		map.generate(regenerate);
		return map;
	}

	public dispose(): void {
		for (const map of this.maps.values())
			map.dispose?.();

		this.maps.clear();
	}
}