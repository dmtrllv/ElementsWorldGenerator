import React, { useEffect, useRef, useState } from "react";
import type { VectorFieldWorkspace } from "../../../editor/workspace";
import { clamp } from "three/src/math/MathUtils.js";
import { Editor, ProjectManager } from "../../../editor";
import { observe } from "../../../state";
import type { Vector2 } from "three";

import "./styles/scalar-view.scss";

export const VectorFieldView = ({ workspace }: { workspace: VectorFieldWorkspace }) => {
	const world = Editor.useModule(ProjectManager).activeProject.worldParams;
	const params = observe(world);
	const vectorField = observe(workspace.vectorField);

	const canvas = useRef<HTMLCanvasElement>(null);

	const dependencies = [
		params.size.x,
		params.size.z,
		vectorField.type,
		vectorField.value,
		vectorField.seedOffset,
		vectorField.scale,
		vectorField.frequency,
		vectorField.strength,
		vectorField.roughness,
		vectorField.octaves,
		vectorField.textureWrap
	];

	useEffect(() => {
		const timeout = setTimeout(() => {
			const ctx = canvas.current?.getContext("2d");
			if (!ctx)
				return;

			const width = params.size.x;
			const height = params.size.z;
			if (!width || !height)
				return;

			canvas.current!.width = width;
			canvas.current!.height = height;

			const image = ctx.createImageData(width, height);
			const pixels = new Uint32Array(image.data.buffer);

			for (let z = 0; z < height; z++) {
				for (let x = 0; x < width; x++) {
					const value: Vector2 = vectorField.get(x, z);

					const red = Math.max(0, Math.min(255, Math.round((value.x * 0.5 + 0.5) * 255)));
					const blue = Math.max(0, Math.min(255, Math.round((value.y * 0.5 + 0.5) * 255)));

					pixels[z * width + x] = 0xFF000000 | (blue << 16) | red;
				}
			}

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
			...state, scale: zoom,
		}));
	};

	useEffect(() => {
		if (vectorField.type === "static")
			workspace.close();
	}, [vectorField.type])

	return (
		<div className="scalar-view" onMouseDown={onMouseDown} style={{ transform: `scale(${state.scale}) translate(${state.offset[0]}px,${state.offset[1]}px)` }} onWheel={onWheel}>
			<canvas ref={canvas} />
		</div>
	);
};