import React, { createContext, useContext, useRef, type PropsWithChildren } from "react";
import { observe } from "../state";

export class Editor {
	public static readonly get = () => {
		const editor = useContext(EditorCtx);
		if (editor === null)
			throw new Error(`Not EditorContext provided!`);
		return editor;
	}

	public static readonly use = <T extends new (editor: Editor) => any>(type: T): InstanceType<T> => {
		const editor = Editor.get();
		return observe(editor.get(type));
	}

	private readonly stores: Map<new (editor: Editor) => any, any> = new Map();

	public readonly get = <T extends new (editor: Editor) => any>(type: T): InstanceType<T> => {
		if (!this.stores.has(type))
			this.stores.set(type, new type(this));
		return this.stores.get(type);
	}
}

export type ObserveCallback<T extends {}> = (editor: Editor) => T;

const EditorCtx = createContext<Editor | null>(null);

export const EditorContext = ({ children }: PropsWithChildren) => {
	const editor = useRef(new Editor());

	return React.createElement(EditorCtx.Provider, { value: editor.current }, children);
};
