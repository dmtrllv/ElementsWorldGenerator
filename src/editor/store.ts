import type { Editor } from "./editor";

export abstract class Store {
	protected readonly editor: Editor;

	public constructor(editor: Editor) {
		this.editor = editor;
	}
}

export type StoreType<T extends Store> = new (editor: Editor) => T;