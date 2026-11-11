import { observable } from "../reactive";
import { randomSeed } from "../utils";
import type { Editor } from "./editor";
import { Project, ProjectInfo } from "./project";
import { SettingsManager } from "./settings";
import { Module } from "./module";
import { ModalManager } from "./modals";
import { SaveModal } from "../ui/modals/saves";
import { NotificationManager } from "./notifications";
import { WorldParams, type WorldParamProps } from "../generator";
import { Menu, MenuItem } from "./menu";

@observable
export class ProjectManager extends Module {
	private static readonly loadProjects = (): ProjectInfo[] => {
		const projects = JSON.parse(localStorage.getItem("editor.saves") || "[]");
		return projects.map((p: any) => new ProjectInfo(p.name));
	}

	private static readonly updateProjects = (info: ProjectInfo[]) => {
		localStorage.setItem("editor.saves", JSON.stringify(info));
	}

	private static saveProject(name: string, worldParams: WorldParams) {
		localStorage.setItem("editor.saves." + name, JSON.stringify({
			name,
			seed: worldParams.seed,
			params: worldParams.toProps(),
		}));
	}

	private static getSavedProject(name: string): SavedProject | null {
		const item = localStorage.getItem(`editor.saves.${name}`);
		if (!item) {
			return null;
		}
		const json = JSON.parse(item);
		return {
			name: json.name,
			seed: json.seed,
			params: WorldParams.parseJsonProps(json.params)
		};
	}

	@observable
	private readonly _projects: ProjectInfo[] = ProjectManager.loadProjects();

	@observable
	private _activeProject: Project;

	public get activeProject() { return this._activeProject; }

	public getProjects(): readonly Readonly<ProjectInfo>[] {
		return this._projects;
	}

	public constructor(editor: Editor) {
		super(editor);
		const settings = editor.get(SettingsManager);
		this._activeProject = new Project(editor.threadManager, { name: "Unsaved" }, randomSeed(), { ...settings.defaultWorldParams }, false);

		document.title = `Unsaved - World Editor`;

		window.onbeforeunload = e => {
			if (this._activeProject.savedGenerationId !== this._activeProject.world.generator.generation) {
				e.preventDefault();
			}
		};
	}

	public async new() {
		if (this._activeProject.savedGenerationId !== this._activeProject.world.generator.generation) {
			if (!await this.editor.get(ModalManager).confirm("Project has unsaved changes, do you want to continue?")) {
				return;
			}
		}
		const settings = this.editor.get(SettingsManager);
		document.title = `Unsaved - World Editor`;
		this._activeProject.world.dispose();
		this._activeProject = new Project(this.editor.threadManager, { name: "Unsaved" }, randomSeed(), { ...settings.defaultWorldParams }, false);
	}

	public async saveAs(name: string, force: boolean = false) {
		const notifiactions = this.editor.get(NotificationManager);
		if (name.length === 0) {
			notifiactions.error("Project name cannot be empty!");
			return false;
		}
		const index = this._projects.findIndex(p => p.name === name);

		if (!force && (index > -1)) {
			notifiactions.error(`Project ${name} already exists!`);
			return false;
		}

		if (index > -1) {
			this._projects.splice(index, 1);
		}

		this._projects.splice(0, 0, { name });
		
		ProjectManager.saveProject(name, this._activeProject.world.worldParams);
		ProjectManager.updateProjects(this._projects);

		this._activeProject.savedGenerationId = this._activeProject.world.generator.generation;

		const item = this.editor.get(Menu).getItemByText("Open Recent");

		if (item) {
			item.children.splice(0, 0, new MenuItem(name, undefined, () => this.open(name)));
		}

		this.editor.get(NotificationManager).notify({
			type: "Info",
			message: `Saved project ${name}!`,
			title: "Saved"
		})

		return true;
	}

	public async save() {
		if (!this._activeProject.fromSave) {
			this.editor.get(ModalManager).open(SaveModal);
		} else {
			this.saveAs(this._activeProject.info.name, true);
		}
	}

	public open(name: string) {
		const notifiactions = this.editor.get(NotificationManager);
		if (this._activeProject.info.name === name) {
			notifiactions.notify({
				type: "Info",
				message: `Project ${name} is already open!`,
				title: `Note`
			});
			return;
		}

		const project = ProjectManager.getSavedProject(name);
		if (!project) {
			notifiactions.error(`Could not find project ${name}!`);
			return;
		}

		document.title = `${name} - World Editor`;
		this._activeProject.world.dispose();
		this._activeProject = new Project(this.editor.threadManager, { name }, project.seed, project.params, true);
	}
}

export type SavedProject = {
	name: string;
	seed: number;
	params: WorldParamProps;
};