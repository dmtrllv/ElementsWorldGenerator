import type { MapGenerator, MapGeneratorType } from "./maps/map";
import { WorldMap } from "./maps/world-map";
import type { WorldParams } from "./params";

export class Generator {
	public readonly worldParams: WorldParams;
	public readonly worldMap: WorldMap;

	public constructor(worldParams: WorldParams) {
		this.worldParams = worldParams;
		this.worldMap = new WorldMap(worldParams);
	}

	public generateMap<T extends MapGenerator>(type: MapGeneratorType<T>, regenerate: boolean = false): T {
		return this.worldMap.generate(type, regenerate);
	}

	public dispose(): void {
		this.worldMap.dispose();
	}
}