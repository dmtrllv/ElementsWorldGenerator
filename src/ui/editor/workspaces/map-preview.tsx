import { useEffect, useRef, useState, type JSX } from "react";
import type { MapPreviewWorkspace } from "../../../editor/workspaces/map-preview";
import { ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";
import { Generator, type MapDataMeta, type MapDataType, type WorldParamsSnapshot } from "../../../generator";
import { NumberInput } from "../../components";
import { useEvent } from "../../hooks/event";
import { clamp } from "../../../utils";

import "./styles/map-preview.scss";

export const MapPreview = ({ workspace, dropControls }: { workspace: MapPreviewWorkspace, dropControls: JSX.Element }) => {
	const { activeProject } = ProjectManager.use();

	const offset = useObservable(workspace.offset);

	const [renderState, setRenderState] = useState<RenderState>({
		chunkRadius: 1,
		downPos: [0, 0],
		downOffset: [0, 0],
		isDown: false,
	});

	const update = (state: Partial<RenderState>) => setRenderState(s => ({ ...s, ...state }));

	const world = useObservable(activeProject.world);
	const generator = useObservable(world.generator);

	const canvas = useRef<HTMLCanvasElement>(null);

	const didRender = useRef(false);
	const timeout = useRef<number | null>(null);

	useEffect(() => {
		if (canvas.current) {
			const c = canvas.current;
			if (!didRender.current) {
				didRender.current = true;
				render(c, generator, workspace.type, workspace.meta, generator.worldParams);
			}

			if (timeout.current !== null)
				clearTimeout(timeout.current);

			timeout.current = setTimeout(() => {
				render(c, generator, workspace.type, workspace.meta, generator.worldParams);
			}, 500);

		}
	}, [generator, renderState.chunkRadius]);

	const canvasStyle: React.CSSProperties = {
		position: "absolute",
		left: `calc(50% + ${offset[0]}px)`,
		top: `calc(50% + ${offset[1]}px)`,
		transform: `translate(-50%, -50%) scale(${workspace.scale * 100}%)`,
		border: `1px solid var(--border-1)`
	};

	const onMouseDown = (e: React.MouseEvent) => {
		update({
			downOffset: [...offset] as [number, number],
			downPos: [e.clientX, e.clientY],
			isDown: true,
		});
	}

	useEvent("mouseup", () => update({ isDown: false }));

	useEvent("mousemove", (e) => {
		if (!renderState.isDown)
			return;

		const { downOffset, downPos } = renderState;

		const deltaX = e.clientX - downPos[0];
		const deltaY = e.clientY - downPos[1];

		workspace.offset = [
			downOffset[0] + deltaX,
			downOffset[1] + deltaY,
		];
	});

	const onWheel = (e: React.WheelEvent) => {
		workspace.scale = clamp(workspace.scale + (e.deltaY / -10000), 0.05, 5);
		
	};

	return (
		<div className="map-preview">
			<div className="toolbar">
				<NumberInput name="radius" min={1} value={renderState.chunkRadius} onChange={r => update({ chunkRadius: r })} />
			</div>
			<div className="workspace" onMouseDown={onMouseDown} onWheel={onWheel}>
				<canvas ref={canvas} style={canvasStyle} />
				{dropControls}
			</div>
		</div>
	);
};

const render = async (canvas: HTMLCanvasElement, generator: Generator, _mapType: MapDataType<any, any>, _meta: MapDataMeta<any>, _worldParams: WorldParamsSnapshot) => {
	const ctx = canvas.getContext("2d");
	if (!ctx)
		throw new Error(`Could not get canvas context!`);
	
	//const map = await generator.generate(mapType, GenerationScope.Global);

	canvas.width = generator.worldParams.size.x;
	canvas.height = generator.worldParams.size.z;

	const imageData = ctx.createImageData(canvas.width, canvas.height);

	//map.debug(imageData, worldParams);

	ctx.putImageData(imageData, 0, 0);
};

type RenderState = {
	chunkRadius: number;
	downPos: [number, number];
	isDown: boolean;
	downOffset: [number, number];
};