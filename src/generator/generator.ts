import type { MapGenerator, MapGeneratorType } from "./maps/map-generator";
import type { WorldParams } from "./world-params";

export class Generator {
	public readonly worldParams: WorldParams;
	protected readonly maps = new Map<MapGeneratorType<any>, MapGenerator<any>>();

	private disposed = false;

	public constructor(worldParams: WorldParams) {
		this.worldParams = worldParams;
	}

	public getMap<T extends MapGeneratorType<any>>(type: T): InstanceType<T> {
		if (this.disposed)
			throw new Error("Cannot access a disposed generator!");

		if (this.maps.has(type))
			return this.maps.get(type) as InstanceType<T>;
		
		const map = new (type as any)(this);
		this.maps.set(type, map);
		return map;
	}

	public dispose(): void {
		if (this.disposed)
			return;

		this.disposed = true;

		for (const map of this.maps.values())
			map.dispose();

		this.maps.clear();
	}

}