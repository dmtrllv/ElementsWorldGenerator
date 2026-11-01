import type { WorldParams } from "../generator/params";
import { World } from "../generator/world";
import { state, store } from "../state";

@store
export class ProjectInfo {
	readonly name: string;

	public constructor(name: string) {
		this.name = name;
	}
}

@store
export class Project {
	public readonly info: ProjectInfo;
	
	@state
	private _world: World;

	public get world(): World {
		return this._world;
	}

	public constructor(info: ProjectInfo, worldParams: WorldParams) {
		this.info = info;
		this._world = new World(worldParams);
	}
}