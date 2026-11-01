import { World } from "../generator/world";
import { state, store } from "../state";
import { randomSeed } from "../utils";
import type { Editor } from "./editor";
import { SettingsManager } from "./settings";
import { Module } from "./store";

@store
export class ProjectManager extends Module {
	private static readonly loadProjects = (): ProjectInfo[] => {
		const projects = JSON.parse(localStorage.getItem("editor.saves") || "[]");
		return projects.map((p: any) => new ProjectInfo(p.name));
	}

	@state
	private readonly _projects: ProjectInfo[] = ProjectManager.loadProjects();

	@state
	private _activeProject: Project;

	public get activeProject() { return this._activeProject; }

	public getProjects(): readonly Readonly<ProjectInfo>[] {
		return this._projects;
	}

	public constructor(editor: Editor) {
		super(editor);
		const settings = editor.get(SettingsManager).defaultParamsSettings.clone(randomSeed());
		this._activeProject = new Project({ name: "Default" }, new World(settings));
	}

	public async saveAs(name: string, force: boolean = false) {
		//if (!force && this.getSaves().includes(name)) {
		//	if (!await this.editor.get(ModalManager).confirm(`Save ${name} already exists, do you want to overwrite?`))
		//		return false;
		//}

		//const world = this.editor.get(Generator).worldSettings;
		//const biomes = this.editor.get(Generator).biomes.biomes;

		//localStorage.setItem("editor.saves." + name, JSON.stringify({
		//	world: Serializer.serialize(world),
		//	biomes: biomes.map(Serializer.serialize)
		//}));


		//if (!this.getSaves().includes(name))
		//	this.saves.push(name);
		//localStorage.setItem("editor.saves", JSON.stringify(this.saves));
		//this.currentSave = name;
		//return true;
		return false;
	}

	public save() {
		//if (!this.currentSave) {
		//	return this.editor.get(ModalManager).open(SaveModal);
		//}

		//if (!this.getSaves().includes(this.currentSave))
		//	this.saves.push(this.currentSave);

		//const world = this.editor.get(Generator).worldSettings;
		//const biomes = this.editor.get(Generator).biomes.biomes;
		//localStorage.setItem("editor.saves." + this.currentSave, JSON.stringify({
		//	world: Serializer.serialize(world),
		//	biomes: biomes.map(biome => Serializer.serialize(biome))
		//}));
	}

	public open(name: string) {
		//const data = localStorage.getItem("editor.saves." + name);
		//if(!data)
		//	return null; // TODO: ERROR/notification

		//let { world, biomes } = JSON.parse(data);
		//world = Serializer.deserialize(WorldSettings, world);
		//biomes = biomes.map((b: any) => Serializer.deserialize(Biome, b));
		//this.editor.get(Generator).biomes.load(biomes);
		//Object.assign(this.editor.get(Generator).worldSettings, world);
		//this.currentSave = name;
	}
}

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