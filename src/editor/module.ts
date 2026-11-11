import { Editor } from "./editor";

export abstract class Module {
	public static use<T extends typeof Module>(this: T): InstanceType<T> {
		return Editor.useModule(this as any);
	}

	protected readonly editor: Editor;

	public constructor(editor: Editor) {
		this.editor = editor;
	}
}

export type ModuleType<T extends Module> = new (editor: Editor) => T;