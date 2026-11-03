import { ParamMap, type ParamMapType } from "./maps/param-map";
import type { WorldParams } from "./world-params";

export class Generator {
	public readonly worldParams: WorldParams;
	protected readonly maps = new Map<ParamMapType<any>, ParamMap<any>>();

	private disposed = false;

	public constructor(worldParams: WorldParams) {
		this.worldParams = worldParams;
	}

	public getMap<T extends ParamMapType<any>>(type: T, overwrite: boolean = false): InstanceType<T> {
		if (this.disposed)
			throw new Error("Cannot access a disposed generator!");

		if (this.maps.has(type) && !overwrite)
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