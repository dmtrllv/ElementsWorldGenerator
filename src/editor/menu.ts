import { state, store } from "../state";
import { SaveModal } from "../ui/modals/saves";
import { ModalManager } from "./modals";
import { ProjectManager } from "./project-manager";
import { Module } from "./store";

@store
export class Menu extends Module {
	private readonly projectManager = this.editor.get(ProjectManager);
	private readonly modalManager = this.editor.get(ModalManager);

	@state
	public readonly items: MenuItem[] = [
		new MenuItem("File", [
			new MenuItem("New"),
			new MenuItem("Open"),
			new MenuItem("Open Recent", () => {
				const recentSaves = this.projectManager.getProjects().slice(0, 5).map(s => {
					return new MenuItem(s.name, [], () => this.projectManager.open(s.name));
				});
				return recentSaves.length > 0 ? recentSaves : [new MenuItem("No saved projects...")];
			}),
			new MenuItem("Save", [], () => this.projectManager.save()),
			new MenuItem("Save As", [], () => this.modalManager.open(SaveModal)),
		]),
		new MenuItem("Edit", [
			new MenuItem("Undo"),
			new MenuItem("Redo"),
		]),
		new MenuItem("View", [
			new MenuItem("Todo"),
		]),
	];
}

let idCounter = 0;

@store
export class MenuItem {
	public readonly id: number = idCounter++;

	@state
	public text: string;

	@state
	public action: Function | null;

	@state
	public children: MenuChild[] | (() => MenuChild[]);

	public constructor(text: string, children: MenuChild[] | (() => MenuChild[]) = [], action: Function | null = null) {
		this.text = text;
		this.action = action;
		this.children = children
	}
}

export class MenuSep {
	public readonly id: number = idCounter++;
}

export type MenuChild = MenuItem | MenuSep;