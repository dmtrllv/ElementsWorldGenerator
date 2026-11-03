import { useRef, useEffect, useState } from "react";
import { Editor, ProjectManager } from "../../../editor";
import type { ParamGroupWorkspace } from "../../../editor/workspaces/param-group-workspace";
import { useObservable } from "../../../reactive";
import { clamp } from "../../../utils";

export const PramPreview = ({ workspace }: { workspace: ParamGroupWorkspace }) => {
	const world = Editor.useModule(ProjectManager).activeProject.world.worldParams;
	const params = useObservable(world); // todo observe recursive?
	const paramGroup = useObservable(workspace.paramGroup);

	const all = paramGroup.getAllParams();

	const canvas = useRef<HTMLCanvasElement>(null);

	const dependencies = [
		params.size.x,
		params.size.z,
		world.seed,
	];

	for(const p of all) {
		useObservable(p);
		if((typeof p.state === "object") && p.state) {
			useObservable(p.state);
			for(const k in p.state) {
				dependencies.push(p.state[k]);
			}
		} else {
			dependencies.push(p.state);
		}
	}

	useEffect(() => {
		const timeout = setTimeout(() => {
			const ctx = canvas.current?.getContext("2d");
			if (!ctx)
				return;

			const width = params.size.x;
			const height = params.size.z;
			if (!width || !height || !paramGroup.preview)
				return;

			canvas.current!.width = width;
			canvas.current!.height = height;

			const image = ctx.createImageData(width, height);
			const pixels = new Uint32Array(image.data.buffer);
			paramGroup.preview!(pixels);
			ctx.putImageData(image, 0, 0);
		}, 100);

		return () => clearTimeout(timeout);
	}, dependencies);

	const [state, setState] = useState({
		isSliding: false,
		downPos: [0, 0],
		offset: [0, 0],
		downOffset: [0, 0],
		scale: 1
	});

	const ref = useRef([state, setState] as const);
	ref.current = [state, setState];

	const onMouseDown = (e: React.MouseEvent) => {
		setState(state => ({
			...state,
			downOffset: [...state.offset],
			downPos: [
				e.clientX,
				e.clientY
			],
			isSliding: true
		}));
	};


	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			const [state, setState] = ref.current;

			if (!state.isSliding)
				return;

			const x = state.downOffset[0]! + (e.clientX - state.downPos[0]!) / state.scale;
			const y = state.downOffset[1]! + (e.clientY - state.downPos[1]!) / state.scale;

			setState(state => ({
				...state,
				offset: [x, y]
			}));
		};

		const onMouseUp = () => {
			setState(state => ({ ...state, isSliding: false }));
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);

		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, [])

	const onWheel = (e: React.WheelEvent) => {
		let zoom = state.scale * Math.exp(-e.deltaY * 0.001);
		zoom = clamp(zoom, 0.05, 20);
		setState(state => ({
			...state,
			scale: zoom,
		}));
	};

	return (
		<div className="scalar-view" onMouseDown={onMouseDown} style={{ transform: `scale(${state.scale}) translate(${state.offset[0]}px,${state.offset[1]}px)` }} onWheel={onWheel}>
			<canvas ref={canvas} />
		</div>
	);
}