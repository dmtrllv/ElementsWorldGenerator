import React, { createContext, useContext, useRef, type PropsWithChildren } from "react";
import { observe } from "../state";
import type { Store, StoreType } from "./store";

export class Editor {
	public static readonly useContext = () => {
		const editor = useContext(EditorCtx);
		if (editor === null)
			throw new Error(`Not EditorContext provided!`);
		return editor;
	}

	public static readonly useStore = <T extends Store>(type: StoreType<T>): T => {
		const editor = Editor.useContext();
		return observe(editor.get(type));
	}

	private readonly stores: Map<StoreType<any>, Store> = new Map();

	public get<T extends Store>(type: StoreType<T>): T {
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
