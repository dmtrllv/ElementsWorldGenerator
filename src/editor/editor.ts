import React, { createContext, useContext, useRef, type PropsWithChildren } from "react";
import { use } from "../state";

export class Editor {
	public static readonly get = () => {
		const editor = useContext(EditorCtx);
		if (editor === null)
			throw new Error(`Not EditorContext provided!`);
		return editor;
	}

	public static readonly use = <T extends new (editor: Editor) => any>(type: T): InstanceType<T> => {
		const editor = Editor.get();
		if(!editor.stores.has(type))
			editor.stores.set(type, new type(editor));
		return use(editor.stores.get(type));
	}

	private readonly stores: Map<new (editor: Editor) => any, any> = new Map();
}

export type ObserveCallback<T extends {}> = (editor: Editor) => T;

const EditorCtx = createContext<Editor | null>(null);

export const EditorContext = ({ children }: PropsWithChildren) => {
	const editor = useRef(new Editor());

	return React.createElement(EditorCtx.Provider, { value: editor.current }, children);
};
