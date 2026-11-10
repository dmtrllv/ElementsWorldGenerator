import { useEffect, useRef, useState, type JSX } from "react";
import type { RendererWorkspace } from "../../../editor/workspaces/renderer";
import { Editor, ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";
import type { Renderer } from "../../../renderer";
import { NumberInput } from "../../components";
import { ElevationMap } from "../../../generator/maps/terrain";
import { GenerationScope } from "../../../generator";
import { Vector2 } from "three";

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
		<>
			<div className="renderer" ref={containerRef} />
			{renderer && <CanvasRenderer renderer={renderer} />}
			{dropControls}
		</>
	);
};

const CanvasRenderer = ({ renderer }: { renderer: Renderer }) => {
	useObservable(renderer);
	useObservable(renderer.controller!);
	const activeProject = Editor.useModule(ProjectManager).activeProject;
	const world = useObservable(activeProject.world);

	const generate = () => {
		renderer.renderWorldHeightmap(world);
	};

	const generateVoxels = () => {
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

	const threadTest = () => {
		activeProject.world.generator.generate(ElevationMap, GenerationScope.Local, new Vector2(0, 0), 1);
	}

	return (
		<div className="buttons" style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)" }} >
			<button onClick={generate} className="generate-btn">
				Heightmap
			</button>
			<button onClick={generateVoxels} className="generate-btn">
				Voxels
			</button>
			<button onClick={threadTest} className="generate-btn">
				Test Threaded
			</button>
			<button onClick={toggleController} className="generate-btn">
				{renderer.controller?.cameraMode === "first-person" ? "Oribal" : "First Person"}
			</button>
			<input type="range" min={50} max={500} value={renderer.renderDistance} onChange={e => renderer.renderDistance = Number.parseInt(e.target.value)} />
			<NumberInput name="speed" min={5} max={100} value={renderer.controller?.movementSpeed || 0} onChange={v => { if(renderer.controller) renderer.controller.movementSpeed = v }} />
			<button onClick={() => renderer.toggleEdges()} className="generate-btn">
				{renderer.showEdges ? "Hide" : "Show"} edges
			</button>
		</div>
	)
}