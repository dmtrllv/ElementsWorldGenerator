import type { Editor } from "./editor";

export class SaveManager {
	public readonly editor: Editor;

	public constructor(editor: Editor) {
		this.editor = editor;
	}
}