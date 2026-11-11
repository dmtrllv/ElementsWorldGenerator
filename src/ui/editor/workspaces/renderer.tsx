import { useEffect, useRef, useState, type JSX } from "react";
import type { RendererWorkspace } from "../../../editor/workspaces/renderer";
import { Editor, ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";
import type { Renderer } from "../../../renderer";
import { NumberInput } from "../../components";

import "./styles/renderer.scss";

export const RendererViewWorkspace = ({ dropControls }: { dropControls: JSX.Element, workspace: RendererWorkspace }) => {
	const editor = Editor.useContext();
	const containerRef = useRef<HTMLDivElement>(null);
	const [renderer, setRenderer] = useState<Renderer | null>(null);

	useEffect(() => {
		let closed = false;
		let r: Renderer | null = null;
		import("../../../renderer").then(({ Renderer }) => {
			const element = containerRef.current;
			if (!element || closed)
				return;
			r = editor.get(Renderer);
			r.initialize(element);
			setRenderer(r);
		});
		return () => {
			closed = true;
			r?.dispose();
		};
	}, []);

	return (
		<div className="renderer">
			{renderer && <Toolbar renderer={renderer} />}
			<div className="viewport" ref={containerRef} />
			{dropControls}
		</div>
	);
};

const Toolbar = ({ renderer }: { renderer: Renderer }) => {
	useObservable(renderer);
	useObservable(renderer.controller!);
	const activeProject = Editor.useModule(ProjectManager).activeProject;
	const world = useObservable(activeProject.world);

	const toggleRender = () => {
		if (renderer.isRendering)
			renderer.pauseRendering();
		else
			renderer.renderVoxelWorld(world);
	};

	const toggleController = () => {
		const controller = renderer.controller;
		if (!controller)
			return
		const cm = controller.cameraMode;

		if (cm === "orbital")
			controller.setCameraMode("first-person");
		else
			controller.setCameraMode("orbital");
	};

	return (
		<div className="toolbar">
			<button onClick={toggleRender} className={`play-btn ${renderer.isRendering ? "play" : ""}`}>
				<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
					<path className="play-icon" d="M17 10.5 L36 21.5 Q39 24 36 26.5 L17 37.5 Q13 39.5 13 35 V13 Q13 8.5 17 10.5Z" />
					<g className="stop-icon">
						<rect x="12" y="12" width="24" height="24" rx="3" />
					</g>
				</svg>
			</button>
			<button onClick={toggleController} className="generate-btn">
				{renderer.controller?.cameraMode === "first-person" ? "Oribal" : "First Person"}
			</button>
			<NumberInput name="render distance" min={50} value={renderer.renderDistance} onChange={e => renderer.renderDistance = e} />
			<NumberInput name="speed" min={5} max={100} value={renderer.controller?.movementSpeed || 0} onChange={v => { if (renderer.controller) renderer.controller.movementSpeed = v }} />
			<button onClick={() => renderer.toggleEdges()} className="generate-btn">
				{renderer.showEdges ? "Hide" : "Show"} edges
			</button>
		</div>
	)
}