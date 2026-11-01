import type { Editor } from "./editor";

export abstract class Module {
	protected readonly editor: Editor;

	public constructor(editor: Editor) {
		this.editor = editor;
	}
}

export type ModuleType<T extends Module> = new (editor: Editor) => T;