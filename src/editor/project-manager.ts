import { state, observable } from "../state";
import { randomSeed } from "../utils";
import type { Editor } from "./editor";
import { Project, ProjectInfo } from "./project";
import { SettingsManager } from "./settings";
import { Module } from "./store";

@observable
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
		const settings = editor.get(SettingsManager);
		this._activeProject = new Project({ name: "Unsaved" }, randomSeed(), { ...settings.defaultWorldParams });
	}

	public async saveAs(_name: string, _force: boolean = false) {
		return false;
	}

	public save() {
	}

	public open(_name: string) {
	}
}
