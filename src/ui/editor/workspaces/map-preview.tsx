import { useEffect, useRef, useState } from "react";
import type { MapPreviewWorkspace } from "../../../editor/workspaces/map-preview";
import { Editor, ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";
import type { Generator, MapDataMeta, MapDataType } from "../../../generator";
import { NumberInput } from "../../components";
import { Vector2 } from "three";

import "./styles/map-preview.scss";

export const MapPreview = ({ workspace }: { workspace: MapPreviewWorkspace }) => {
	const { activeProject } = Editor.useModule(ProjectManager);

	const [renderState, setRenderState] = useState({
		offset: [0, 0],
		chunkRadius: 1,
		downPos: [0, 0],
		downOffset: [0, 0],
		isDown: false,
	});

	const update = (state: Partial<RenderState>) => setRenderState(s => ({ ...s, ...state }));

	const generator = useObservable(activeProject.world.generator);

	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (canvas.current)
			render(canvas.current, generator, workspace.type, workspace.meta);
	}, [generator, renderState.chunkRadius]);

	const canvasStyle: React.CSSProperties = {
		position: "absolute",
		left: `calc(50% + ${renderState.offset[0]}px)`,
		top: `calc(50% + ${renderState.offset[1]}px)`,
		transform: `translate(-50%, -50%)`,
		border: `1px solid var(--border-1)`
	};

	const onMouseDown = (e: React.MouseEvent) => {
		update({
			
		})
	}

	return (
		<div className="map-preview">
			<div className="toolbar">
				<NumberInput name="radius" min={1} value={renderState.chunkRadius} onChange={r => update({ chunkRadius: r })} />
			</div>
			<div className="workspace" onMouseDown={onMouseDown}>
				<canvas ref={canvas} style={canvasStyle} />
			</div>
		</div>
	);
};

const render = (canvas: HTMLCanvasElement, generator: Generator, mapType: MapDataType<any>, meta: MapDataMeta<any>) => {
	const ctx = canvas.getContext("2d");
	if (!ctx)
		throw new Error(`Could not get canvas context!`);

	const map = generator.generateMap(mapType, "Local", new Vector2(0, 0));

	console.log("render", map)
};

type RenderState = {
	offset: [number, number];
	chunkRadius: number;
	downPos: [number, number];
	isDown: boolean;
	downOffset: [number, number];
};