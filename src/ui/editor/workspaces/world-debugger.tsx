import { useMemo, useState, type JSX } from "react";
import { useCanvasControls } from "../../components/canvas-renderer";
import { ProjectManager, WorldDebugWorkspace } from "../../../editor";
import { useObservable } from "../../../reactive";
import type { Project } from "../../../editor/project";

import {
	CoastMap, ContinentalMap, ElevationMap, GenerationScope, HillMap,
	MountainMap, OceanMap, PlainsMap, PlateauMap, ValleyMap, type DebugRenderType, type Generator, type MapDataType, type World
} from "../../../generator";

import "./styles/world-debugger.scss";
import { nameToLabel } from "../../components";
import { white } from "../../../utils";

const MAP_TYPES = {
	ElevationMap,
	ContinentalMap,
	OceanMap,
	CoastMap,
	MountainMap,
	HillMap,
	PlainsMap,
	PlateauMap,
	ValleyMap
};

export const WorldDebugger = ({ dropControls }: { workspace: WorldDebugWorkspace, dropControls: JSX.Element }) => {
	const project = useObservable(ProjectManager.use().activeProject);
	const world = useObservable(project.world);
	const generator = useObservable(world.generator);

	const dependencies = [project, world, generator] as const;

	const renderer = useMemo(() => new WorldDebugRenderer(...dependencies), dependencies);

	const [renderState, setRenderState] = useState<RenderState>({
		ElevationMap: "factor",
		ContinentalMap: "border",
		OceanMap: "none",
		CoastMap: "none",
		MountainMap: "none",
		HillMap: "none",
		PlainsMap: "none",
		PlateauMap: "none",
		ValleyMap: "none",
	});

	const { onMouseDown, onWheel, ref, style } = useCanvasControls({
		render: (canvas) => renderer.render(canvas, renderState)
	}, [...dependencies, renderState]);

	return (
		<div className="world-debugger">
			<div className="toolbar">

			</div>
			<div className="workspace" onMouseDown={onMouseDown} onWheel={onWheel}>
				<canvas ref={ref} style={style} />
				{dropControls}
			</div>
			<div className="debug-sidebar">
				{Object.keys(renderState).map(k => {
					const state = renderState[k as keyof typeof renderState];
					return (
						<div className="type-input">
							<div className="label">
								{nameToLabel(k)}:
							</div>
							<select name="render-type" value={state} onChange={e => setRenderState(s => ({ ...s, [k]: e.target.value }))}>
								<option value="none">None</option>
								<option value="border">Border</option>
								<option value="factor">Factor</option>
							</select>
						</div>
					);
				})}
			</div>
		</div>
	);
};

type RenderState = {
	[K in keyof typeof MAP_TYPES]: RenderType;
};

type RenderType = "none" | DebugRenderType;

class WorldDebugRenderer {
	private readonly project: Project;
	private readonly world: World;
	private readonly generator: Generator;

	public constructor(project: Project, world: World, generator: Generator) {
		this.project = project;
		this.world = world;
		this.generator = generator;
	}

	public readonly render = async (canvas: HTMLCanvasElement, state: RenderState) => {
		const ctx = canvas.getContext("2d");
		if (!ctx)
			throw new Error(`Could not get canvas context!`);

		const MAX_OVERVIEW_SIZE = 1024 / 4;

		canvas.width = canvas.height = MAX_OVERVIEW_SIZE;

		const size = this.world.worldParams.size;

		const resolution = Math.max(1, Math.ceil(Math.max(size.x, size.z) / (MAX_OVERVIEW_SIZE)));

		const imageData = ctx.createImageData(MAX_OVERVIEW_SIZE, MAX_OVERVIEW_SIZE);
		console.log("render");
		for (const name in state) {
			const type = MAP_TYPES[name as keyof typeof MAP_TYPES];
			await this.renderMap(imageData, type, state[name as keyof typeof state], resolution);
		}

		ctx.putImageData(imageData, 0, 0);
	}


	private async renderMap(imageData: ImageData, type: MapDataType<any, any>, renderType: RenderType, resolution: number) {
		if (renderType === "none")
			return;

		const map = await this.generator.generate(type, GenerationScope.Global, undefined, resolution);
		map.debug(imageData, this.world.worldParams, renderType);
	}
}

