import { WorldMap } from "./maps/world-map";
import type { WorldParams } from "./params";

export class Generator {
	public readonly worldParams: WorldParams;
	public readonly worldMap: WorldMap;

	public constructor(worldParams: WorldParams) {
		this.worldParams = worldParams;
		this.worldMap = new WorldMap(worldParams);
	}
}