import { createContext, useContext } from "react";
import { Renderer } from "../renderer";
import { Generator } from "../generator";

export type EditorContextType = {
	readonly renderer: Renderer;
}

export class Editor {
	public readonly renderer = new Renderer();
	public readonly generator = new Generator();
}

const EditorContext = createContext<Editor>(new Editor());

export const useEditor = () => useContext(EditorContext);
