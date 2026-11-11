import { useMemo, type JSX } from "react";
import type { MapPreviewWorkspace } from "../../../editor/workspaces/map-preview";
import { useCanvasControls } from "../../components/canvas-renderer";
import { ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";

import "./styles/map-preview.scss";
import type { Project } from "../../../editor/project";
import type { Generator, World } from "../../../generator";


export const WorldDebugger = ({  dropControls }: { workspace: MapPreviewWorkspace, dropControls: JSX.Element }) => {
	const project = useObservable(ProjectManager.use().activeProject);
	const world = useObservable(project.world);
	const generator = useObservable(world.generator);

	const dependencies = [project, world, generator] as const;

	const renderer = useMemo(() => new WorldDebugRenderer(...dependencies), dependencies);

	const { onMouseDown, onWheel, ref, style } = useCanvasControls({
		render: renderer.render
	}, dependencies);

	return (
		<div className="world-debug-workspace">
			<div className="toolbar">

			</div>
			<div className="workspace" onMouseDown={onMouseDown} onWheel={onWheel}>
				<canvas ref={ref} style={style} />
				{dropControls}
			</div>
		</div>
	);
};

class WorldDebugRenderer {
	private readonly project: Project;
	private readonly world: World;
	private readonly generator: Generator;

	public constructor(project: Project, world: World, generator: Generator) {
		this.project = project;
		this.world = world;
		this.generator = generator;
	}

	public readonly render = async (canvas: HTMLCanvasElement) => {
		const ctx = canvas.getContext("2d");
		if (!ctx)
			throw new Error(`Could not get canvas context!`);

		const imageData = ctx.createImageData(canvas.width, canvas.height);
		console.log("render");
		// async generate maps?
		
	}
}

