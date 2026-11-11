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

	@observable
	private _saved: boolean;

	public get fromSave(): boolean {
		return this._saved;
	}

	@observable
	public savedGenerationId: number = 0;

	public constructor(ThreadManager: ThreadManager, info: ProjectInfo, seed: number, worldParams: WorldParamProps, fromSave: boolean = false) {
		this._saved = fromSave;
		this.info = info;
		this.world = new World(ThreadManager, seed, worldParams);
		this.savedGenerationId = this.world.generator.generation;
	}
}