import { useEffect, useRef, useState } from "react";
import { useEvent } from "../hooks/event";
import { clamp } from "../../utils";

export const useCanvasControls = (handlers: CanvasEventChangeHandlers, rerenderDependencies: readonly any[] = []) => {
	const [{ scale, offset, downOffset, downPos, isDown }, setRenderState] = useState<RenderState>({
		downPos: [0, 0],
		downOffset: [0, 0],
		isDown: false,
		offset: [0, 0],
		scale: 1,
	});

	const update = (state: Partial<RenderState>) => setRenderState(s => ({ ...s, ...state }));

	const canvas = useRef<HTMLCanvasElement>(null);

	const didRender = useRef(false);
	const timeout = useRef<number | null>(null);

	useEffect(() => {
		if (canvas.current) {
			const c = canvas.current;
			if (!didRender.current) {
				didRender.current = true;
				handlers.render(c);
			}

			if (timeout.current !== null)
				clearTimeout(timeout.current);

			timeout.current = setTimeout(() => {
				handlers.render(c);
			}, 500);
		}
	}, rerenderDependencies);

	const style: React.CSSProperties = {
		position: "absolute",
		left: `calc(50% + ${offset[0]}px)`,
		top: `calc(50% + ${offset[1]}px)`,
		transform: `translate(-50%, -50%) scale(${scale * 100}%)`,
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
		if (!isDown)
			return;

		const deltaX = e.clientX - downPos[0];
		const deltaY = e.clientY - downPos[1];
		update({
			offset: [
				downOffset[0] + deltaX,
				downOffset[1] + deltaY,
			]
		})
	});

	const onWheel = (e: React.WheelEvent) => {
		update({ scale: clamp(scale + (e.deltaY / -10000), 0.05, 5) });
	};

	return {
		onWheel,
		onMouseDown,
		style,
		ref: canvas
	}
};

type CanvasEventChangeHandlers = {
	render: (canvas: HTMLCanvasElement) => void;
	scale?: (scale: number) => void;
	move?: (offset: [number, number]) => void;
};

type RenderState = {
	downPos: [number, number];
	isDown: boolean;
	downOffset: [number, number];
	offset: [number, number];
	scale: number;
};