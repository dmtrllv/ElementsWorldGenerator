import { ParamMap, type ParamMapType } from "./param-map";
import type { WorldParams } from "./world-params";

export class Generator {
	public readonly worldParams: WorldParams;
	protected readonly maps = new Map<ParamMapType<any>, ParamMap<any>>();

	public constructor(worldParams: WorldParams) {
		this.worldParams = worldParams;
	}

	public getMap<T extends ParamMapType<any>>(type: T, overwrite: boolean = false): InstanceType<T> {
		if(this.maps.has(type) && !overwrite)
			return this.maps.get(type) as InstanceType<T>;
		const map = new (type as any)(this);
		this.maps.set(type, map);
		return map;	
	}
}