import { useEffect, useRef, useState } from "react";
import type { MapPreviewWorkspace } from "../../../editor/workspaces/map-preview";
import { Editor, ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";
import { GenerationScope, Generator, type MapDataMeta, type MapDataType } from "../../../generator";
import { NumberInput } from "../../components";
import { useEvent } from "../../hooks/event";

import "./styles/map-preview.scss";

export const MapPreview = ({ workspace }: { workspace: MapPreviewWorkspace }) => {
	const { activeProject } = Editor.useModule(ProjectManager);

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
				render(c, generator, workspace.type, workspace.meta);
			}

			if (timeout.current !== null)
				clearTimeout(timeout.current);

			timeout.current = setTimeout(() => {
				render(c, generator, workspace.type, workspace.meta);
			}, 500);

		}
	}, [generator, renderState.chunkRadius]);

	const canvasStyle: React.CSSProperties = {
		position: "absolute",
		left: `calc(50% + ${offset[0]}px)`,
		top: `calc(50% + ${offset[1]}px)`,
		transform: `translate(-50%, -50%)`,
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
	})

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

const render = (canvas: HTMLCanvasElement, generator: Generator, mapType: MapDataType<any, any>, meta: MapDataMeta<any>) => {
	const ctx = canvas.getContext("2d");
	if (!ctx)
		throw new Error(`Could not get canvas context!`);

	const map = generator.generateMap(mapType, GenerationScope.Global);

	canvas.width = generator.worldParams.size.x;
	canvas.height = generator.worldParams.size.z;

	const imageData = ctx.createImageData(canvas.width, canvas.height);

	map.debug(imageData);

	ctx.putImageData(imageData, 0, 0);
};

type RenderState = {
	chunkRadius: number;
	downPos: [number, number];
	isDown: boolean;
	downOffset: [number, number];
};