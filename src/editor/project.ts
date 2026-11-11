import type { ThreadManager } from "../generator/threads";
import { World } from "../generator/world";
import type { WorldParamProps } from "../generator/world-params";
import { observable } from "../reactive";

@observable({ auto: true })
export class ProjectInfo {
	readonly name: string;

	public constructor(name: string) {
		this.name = name;
	}
}

@observable({ auto: true })
export class Project {
	public readonly info: ProjectInfo;
	public readonly world: World;

	public constructor(ThreadManager: ThreadManager, info: ProjectInfo, seed: number, worldParams: WorldParamProps) {
		this.info = info;
		this.world = new World(ThreadManager, seed, worldParams);
	}
}