import { state, store } from "../state";
import { SaveModal } from "../ui/modals/saves";
import type { Editor } from "./editor";
import { ModalManager } from "./modals";
import { SaveManager } from "./save-manager";

@store
export class Menu {
	public readonly editor: Editor;

	@state
	public items: MenuItem[];

	public constructor(editor: Editor) {
		this.editor = editor;
		const saves = editor.get(SaveManager);

		const recentSaves = Array.from(saves.getSaves().values()).slice(0, 5).map(s => new MenuItem(s, () => saves.open(s)));

		this.items = [
			new MenuItem("File", [
				new MenuItem("New", () => { }),
				new MenuItem("Open", () => { }),
				new MenuItem("Open Recent", () => { }, recentSaves.length > 0 ? recentSaves : [new MenuItem("No saved projects...", [])]),
				new MenuItem("Save", () => saves.save()),
				new MenuItem("Save As", () => this.editor.get(ModalManager).open(SaveModal)),
			]),
			new MenuItem("Edit", [
				new MenuItem("Undo", () => { }),
				new MenuItem("Redo", () => { }),
			]),
			new MenuItem("View", [
				new MenuItem("Todo", () => { }),
			]),
		]
	}
}

let idCounter = 0;

@store
export class MenuItem {
	public readonly id: number = idCounter++;

	@state
	public text: string;

	@state
	public action: { fn: Function } | null;

	@state
	public children: MenuChild[];

	public constructor(text: string, children: MenuChild[]);
	public constructor(text: string, action: Function, children?: MenuChild[]);
	public constructor(text: string, ...args: any[]) {
		this.text = text;
		if (typeof args[0] === "function") {
			this.action = { fn: args[0] };
			this.children = args[1] || [];
		} else {
			this.action = null;
			this.children = args[0];
		}
	}
}

export class MenuSep {
	public readonly id: number = idCounter++;
}

export type MenuChild = MenuItem | MenuSep;