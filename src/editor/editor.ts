import React, { createContext, useContext, useRef, type PropsWithChildren } from "react";
import { computed, observable, useObservable } from "../reactive";
import type { Module, ModuleType } from "./store";
import { ThreadManager } from "../generator/threads";

@observable
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

	@observable
	private _isInitialized: boolean = false;
	
	private _initializePromise: null | Promise<void> = null;

	@computed
	public get isInitialized() {
		return this._isInitialized;
	}

	public readonly threadManager: ThreadManager = new ThreadManager();

	private readonly stores: Map<ModuleType<any>, Module> = new Map();

	public constructor(init?: (editor: Editor) => any) {
		init?.(this);
	}

	public async initialize() {
		if (this._initializePromise)
			return this._initializePromise;
		if (this._isInitialized)
			return;
		this._isInitialized = true;
		this._initializePromise = new Promise(async (resolve) => {
			await this.onInitialize();
			resolve();
		});
	}

	private readonly onInitialize = async () => {
		await this.threadManager.initialize();
	}

	public get<T extends Module>(type: ModuleType<T>): T {
		if (!this.stores.has(type))
			this.stores.set(type, new type(this));
		return this.stores.get(type) as T;
	}
}

const EditorCtx = createContext<Editor | null>(null);

export const EditorContext = ({ children, init }: PropsWithChildren<{ init?: (editor: Editor) => any }>) => {
	const editor = useRef(new Editor(init));

	return React.createElement(EditorCtx.Provider, { value: editor.current }, children);
};
