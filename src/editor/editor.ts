import React, { createContext, useContext, useRef, type PropsWithChildren } from "react";
import { useObservable } from "../reactive";
import type { Module, ModuleType } from "./store";

export class Editor {
	public static readonly useContext = () => {
		const editor = useContext(EditorCtx);
		if (editor === null)
			throw new Error(`Not EditorContext provided!`);
		return editor;
	}

	public static readonly useModule = <T extends Module>(type: ModuleType<T>): T => {
		const editor = Editor.useContext();
		return useObservable(editor.get(type));
	}

	private readonly stores: Map<ModuleType<any>, Module> = new Map();

	public get<T extends Module>(type: ModuleType<T>): T {
		if (!this.stores.has(type))
			this.stores.set(type, new type(this));
		return this.stores.get(type) as T;
	}
}

const EditorCtx = createContext<Editor | null>(null);

export const EditorContext = ({ children }: PropsWithChildren) => {
	const editor = useRef(new Editor());

	return React.createElement(EditorCtx.Provider, { value: editor.current }, children);
};
