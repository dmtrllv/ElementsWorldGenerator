import { useEffect, useRef } from "react";
import type { RendererWorkspace } from "../../../editor/workspaces/renderer";
import { Editor, ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";

export const RendererViewWorkspace = (_: { workspace: RendererWorkspace }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const editor = Editor.useContext();
	const renderer = useRef<import("../../../renderer").Renderer>(null);
	
	useEffect(() => {
		let closed = false;
		import("../../../renderer").then(({ Renderer }) => {
			const element = containerRef.current;
			if (!element || closed)
				return;

			renderer.current = editor.get(Renderer)
			renderer.current.initialize(element);

		});
		return () => {
			closed = true;
			renderer.current?.dispose()
		};
	}, []);

	const activeProject = Editor.useModule(ProjectManager).activeProject;
	const world = useObservable(activeProject.world);

	const generate = () => {
		renderer.current?.renderWorld(world);
	}

	return (
		<>
			<div className="renderer" ref={containerRef} />
			<button onClick={generate} style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)" }} className="generate-btn">
				Generate
			</button>
		</>
	);
};