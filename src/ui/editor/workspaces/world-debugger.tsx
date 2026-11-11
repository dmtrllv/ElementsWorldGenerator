import { useMemo, useState, type JSX } from "react";
import { useCanvasControls } from "../../components/canvas-renderer";
import { ProjectManager, WorldDebugWorkspace } from "../../../editor";
import { useObservable } from "../../../reactive";
import { ColorInput, NumberInput } from "../../components";
import { rgb, type Color } from "../../../utils";
import {
	CoastMap, ContinentalMap, ElevationMap, HillMap,
	MountainMap, OceanMap, PlainsMap, PlateauMap, Region, ValleyMap,
	type DebugRenderType, type MapDataType, type World
} from "../../../generator";

import "./styles/world-debugger.scss";

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

const DEFAULT_RENDER_RADIUS = 256;
const DEFAULT_RESOLUTION = 2;

export const WorldDebugger = ({ dropControls }: { workspace: WorldDebugWorkspace, dropControls: JSX.Element }) => {
	const project = useObservable(ProjectManager.use().activeProject);
	const world = useObservable(project.world);
	const generator = useObservable(world.generator);

	const dependencies = [project, world, generator] as const;

	const [renderRadius, setRenderRadius] = useState(DEFAULT_RENDER_RADIUS);
	const [resolution, setResolution] = useState(DEFAULT_RESOLUTION);

	const [renderState, setRenderState] = useState<RenderState>({
		ElevationMap: {
			type: "factor",
			color: rgb(255, 255, 255)
		},
		ContinentalMap: {
			type: "border",
			color: rgb(255, 255, 255)
		},
		OceanMap: {
			type: "none",
			color: rgb(255, 255, 255)
		},
		CoastMap: {
			type: "none",
			color: rgb(255, 255, 255)
		},
		MountainMap: {
			type: "none",
			color: rgb(255, 255, 255)
		},
		HillMap: {
			type: "none",
			color: rgb(255, 255, 255)
		},
		PlainsMap: {
			type: "none",
			color: rgb(255, 255, 255)
		},
		PlateauMap: {
			type: "none",
			color: rgb(255, 255, 255)
		},
		ValleyMap: {
			type: "none",
			color: rgb(255, 255, 255)
		},
	});

	
	const renderer = useMemo(() => new WorldDebugRenderer(world, renderState), dependencies);

	const { onMouseDown, onWheel, ref, style } = useCanvasControls({
		render: canvas => renderer.render(canvas, renderState, renderRadius, resolution),
		viewport: (canvas, offset, scale) => renderer.loadVisible(canvas, offset, scale)
	}, [...dependencies, renderState, renderRadius, resolution]);

	return (
		<div className="world-debugger">
			<div className="toolbar">
				<NumberInput name="render radius" min={1} max={Math.max(world.worldParams.size.x, world.worldParams.size.z) / 2} step={world.worldParams.chunkSize} value={renderRadius} onChange={setRenderRadius} />
				<NumberInput name="resolution" min={1} max={world.worldParams.chunkSize} step={1} value={resolution} onChange={setResolution} />
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
							<ColorInput name={k} value={state.color} onChange={c => setRenderState(s => ({ ...s, [k]: { ...s[k as keyof typeof s], color: c } }))} />
							<select name="render-type" value={state.type} onChange={e => setRenderState(s => ({ ...s, [k]: { ...s[k as keyof typeof s], type: e.target.value as RenderType, } }))}>
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
	[K in keyof typeof MAP_TYPES]: {
		type: RenderType;
		color: Color;
	};
};

type RenderType = "none" | DebugRenderType;

type RenderCamera = {
	offset: [number, number];
	scale: number;
};

class WorldDebugRenderer {
	private readonly world: World;

	private canvas: HTMLCanvasElement | null = null;
	private state: RenderState;
	private resolution = DEFAULT_RESOLUTION;
	private renderRadius = DEFAULT_RENDER_RADIUS;

	private readonly renderedChunks = new Set<string>();

	private camera: RenderCamera = {
		offset: [0, 0],
		scale: 1
	};

	private version = 0;
	private cacheSignature = "";
	private loading = false;
	private loadTimeout: number | null = null;

	public constructor(world: World, state: RenderState) {
		this.world = world;
		this.state = state;
	}

	private getActiveMaps() {
		return Object.entries(this.state)
			.filter(([, renderType]) => renderType.type !== "none")
			.map(([name, renderType]) => ({
				type: MAP_TYPES[name as keyof typeof MAP_TYPES] as MapDataType<any, any>,
				renderType: renderType.type as DebugRenderType,
				color: renderType.color
			}));
	}

	private getCacheSignature(state: RenderState, resolution: number) {
		return `${resolution}:${Object.entries(state).map(([name, type]) => `${name}:${type.type}:${type.color}`).join("|")}`;
	}

	public readonly render = (canvas: HTMLCanvasElement, state: RenderState, renderRadius: number, resolution: number) => {
		this.canvas = canvas;
		this.state = state;
		this.renderRadius = Math.max(1, Math.floor(renderRadius));
		this.resolution = Math.max(1, Math.min(Math.floor(resolution), this.world.worldParams.chunkSize));

		const signature = this.getCacheSignature(state, this.resolution);
		const cacheChanged = signature !== this.cacheSignature;

		if (cacheChanged) {
			this.cacheSignature = signature;
			this.version++;
			this.renderedChunks.clear();
		}

		const params = this.world.worldParams;
		const region = params.region;

		const minX = Math.ceil(region.x / this.resolution);
		const minZ = Math.ceil(region.z / this.resolution);
		const maxX = Math.ceil(region.maxX / this.resolution);
		const maxZ = Math.ceil(region.maxZ / this.resolution);

		const width = Math.max(1, maxX - minX);
		const height = Math.max(1, maxZ - minZ);

		if (canvas.width !== width)
			canvas.width = width;

		if (canvas.height !== height)
			canvas.height = height;

		canvas.style.width = `${region.width}px`;
		canvas.style.height = `${region.height}px`;

		if (cacheChanged) {
			const ctx = canvas.getContext("2d");

			if (!ctx)
				throw new Error("Could not get canvas context!");

			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}

		this.scheduleLoad();
	};

	public readonly loadVisible = (canvas: HTMLCanvasElement, offset: [number, number], scale: number) => {
		this.canvas = canvas;
		this.camera = { offset, scale: Math.max(0.05, scale) };

		this.scheduleLoad();
	};

	private scheduleLoad() {
		if (!this.canvas || this.loadTimeout !== null)
			return;

		this.loadTimeout = window.setTimeout(() => {
			this.loadTimeout = null;
			void this.loadChunks();
		}, 100);
	}

	private getVisibleRegion() {
		if (!this.canvas?.parentElement)
			return null;

		const worldRegion = this.world.worldParams.region;
		const scale = this.camera.scale;

		const centerX = worldRegion.x + worldRegion.width / 2 - this.camera.offset[0] / scale;
		const centerZ = worldRegion.z + worldRegion.height / 2 - this.camera.offset[1] / scale;

		const region = new Region(
			centerX - this.renderRadius,
			centerZ - this.renderRadius,
			this.renderRadius * 2,
			this.renderRadius * 2
		);

		return region.intersection(worldRegion);
	}

	private isChunkInsideRegion(chunk: any, region: Region) {
		const chunkRegion = chunk.region;

		return chunkRegion.x < region.maxX &&
			chunkRegion.maxX > region.x &&
			chunkRegion.z < region.maxZ &&
			chunkRegion.maxZ > region.z;
	}

	private async loadChunks() {
		if (this.loading || !this.canvas)
			return;

		const visibleRegion = this.getVisibleRegion();

		if (!visibleRegion)
			return;

		const activeMaps = this.getActiveMaps();

		if (activeMaps.length === 0)
			return;

		const version = this.version;
		const canvas = this.canvas;
		const ctx = canvas.getContext("2d");

		if (!ctx)
			return;

		const chunks = this.world.chunkManager.getChunks(visibleRegion);
		const missingChunks = chunks.filter(chunk => !this.renderedChunks.has(`${chunk.x}:${chunk.z}`));

		if (missingChunks.length === 0)
			return;

		const centerX = visibleRegion.x + visibleRegion.width / 2;
		const centerZ = visibleRegion.z + visibleRegion.height / 2;

		missingChunks.sort((a, b) => {
			const ax = a.region.x + a.region.width / 2 - centerX;
			const az = a.region.z + a.region.height / 2 - centerZ;
			const bx = b.region.x + b.region.width / 2 - centerX;
			const bz = b.region.z + b.region.height / 2 - centerZ;

			return ax * ax + az * az - (bx * bx + bz * bz);
		});

		this.loading = true;

		try {
			const params = this.world.worldParams;
			const worldRegion = params.region;
			const sampleX = Math.ceil(worldRegion.x / this.resolution);
			const sampleZ = Math.ceil(worldRegion.z / this.resolution);

			for (const chunk of missingChunks) {
				if (version !== this.version)
					return;

				if (!this.isChunkInsideRegion(chunk, this.getVisibleRegion()!))
					continue;

				const id = `${chunk.x}:${chunk.z}`;

				if (this.renderedChunks.has(id))
					continue;

				let imageData: ImageData | null = null;
				let imageX = 0;
				let imageZ = 0;
				let stillRelevant = true;

				for (const { type, renderType, color } of activeMaps) {
					const map = await this.world.chunkManager.generateMap(type, chunk, this.resolution);

					if (version !== this.version)
						return;

					const currentRegion = this.getVisibleRegion();

					if (!currentRegion || !this.isChunkInsideRegion(chunk, currentRegion)) {
						stillRelevant = false;
						break;
					}

					if (map.samples.width === 0 || map.samples.height === 0)
						continue;

					if (!imageData) {
						imageData = ctx.createImageData(map.samples.width, map.samples.height);
						imageX = Math.round(map.samples.x / this.resolution) - sampleX;
						imageZ = Math.round(map.samples.z / this.resolution) - sampleZ;
					}

					map.debug(imageData, params, renderType, color);
				}

				if (version !== this.version)
					return;

				if (!stillRelevant)
					continue;

				if (imageData) {
					ctx.putImageData(imageData, imageX, imageZ);
					this.renderedChunks.add(id);
				}
			}
		}
		finally {
			this.loading = false;
			this.scheduleLoad();
		}
	}
}