import type { World } from "../generator/world";
import { store } from "../state";

@store
export class ProjectInfo {
	readonly name: string;

	public constructor(name: string) {
		this.name = name;
	}
}

export class Project {
	public readonly info: ProjectInfo;
	public readonly world: World;

	public constructor(info: ProjectInfo, world: World) {
		this.info = info;
		this.world = world;
	}
}