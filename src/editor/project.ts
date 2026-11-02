import { store } from "../state";

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
	
	public constructor(info: ProjectInfo) {
		this.info = info;
	}
}