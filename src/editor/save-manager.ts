import { state, store } from "../state";
import type { Editor } from "./editor";

@store
export class SaveManager {
	public readonly editor: Editor;

	@state
	private readonly saves: Record<string, any> = JSON.parse(localStorage.getItem("editor.saves") || "{}");

	public constructor(editor: Editor) {
		this.editor = editor;
	}

	public getSaves(): string[] {
		return Object.keys(this.saves);
	}

	public save(name: string) {
		this.saves[name] = name;
	}
}