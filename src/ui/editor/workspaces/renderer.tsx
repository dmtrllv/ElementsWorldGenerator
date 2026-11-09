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
		renderer.current?.renderWorldHeightmap(world);
	}

	const generateVoxels = () => {
		renderer.current?.renderVoxelWorld(world);
	}

	const toggleController = () => {
		const controller = renderer.current?.controller;
		if(!controller)
			return
		const cm = controller.cameraMode;

		if(cm === "orbital")
			controller.setCameraMode("first-person");
		else
			controller.setCameraMode("orbital");
	}

	const cm = renderer.current?.controller?.cameraMode;

	return (
		<>
			<div className="renderer" ref={containerRef} />
			<div className="buttons" style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)" }} >
				<button onClick={generate} className="generate-btn">
					Heightmap
				</button>
				<button onClick={generateVoxels} className="generate-btn">
					Voxels
				</button>
				<button onClick={toggleController} className="generate-btn">
					{cm === "first-person" ? "Oribal" : "First Person"}
				</button>
			</div>
		</>
	);
};