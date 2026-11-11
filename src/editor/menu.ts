import { createObservable, observable } from "../reactive";
import { SaveModal } from "../ui/modals/saves";
import { ModalManager } from "./modals";
import { ProjectManager } from "./project-manager";
import { Module } from "./module";

@observable
export class Menu extends Module {
	private readonly projectManager = this.editor.get(ProjectManager);
	private readonly modalManager = this.editor.get(ModalManager);

	@observable
	public readonly items: MenuItem[] = [
		new MenuItem("File", [
			new MenuItem("New", [], () => this.projectManager.new()),
			new MenuItem("Open"),
			new MenuItem("Open Recent", this.recentProjects),
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

	private get recentProjects() {
		const recentSaves = this.projectManager.getProjects().slice(0, 5).map(s => {
			return new MenuItem(s.name, [], () => this.projectManager.open(s.name));
		});
		return recentSaves.length > 0 ? recentSaves : [new MenuItem("No saved projects...")];
	}

	public getItemByText(text: string) {
		const find = (items: MenuChild[]): MenuItem | null => {
			for (const item of items) {
				if(!("text" in item))
					continue;

				if (item.text === text)
					return item;

				const found = find(item.children);
				if(found)
					return found;
			}
			return null;
		}

		return find(this.items);
	}
}

let idCounter = 0;

@observable
export class MenuItem {
	public readonly id: number = idCounter++;

	@observable
	public text: string;

	@observable
	public action: Function;

	@observable
	public children: MenuChild[];

	public constructor(text: string, children: MenuChild[] = [], action: Function = () => { }) {
		this.text = text;
		this.action = createObservable(action);
		this.children = createObservable(children);
	}
}

export class MenuSep {
	public readonly id: number = idCounter++;
}

export type MenuChild = MenuItem | MenuSep;