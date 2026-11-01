import { World, type WorldParams } from "../generator/world";
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
	public readonly worldParams: WorldParams;
	
	@state
	private world: World | null = null;

	public constructor(info: ProjectInfo, worldParams: WorldParams) {
		this.info = info;
		this.worldParams = worldParams;
	}

	public generate() {
		if (this.world)
			this.world.dispose();
		this.world = new World(this.worldParams.clone());

	}
}