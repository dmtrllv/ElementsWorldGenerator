import { World } from "../generator/world";
import type { WorldParamProps } from "../generator/world-params";
import { observable } from "../state";

@observable
export class ProjectInfo {
	readonly name: string;

	public constructor(name: string) {
		this.name = name;
	}
}

export class Project {
	public readonly info: ProjectInfo;
	public readonly world: World;
	
	public constructor(info: ProjectInfo, seed: number, worldParams: WorldParamProps) {
		this.info = info;
		this.world = new World(seed, worldParams);
	}
}