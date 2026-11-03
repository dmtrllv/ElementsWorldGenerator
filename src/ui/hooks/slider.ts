import { useState, useRef, useEffect } from "react";
import { clamp } from "../../utils";

export const useSlider = (init: number, min: number, max: number, dir: "x" | "y", scale: number = 1) => {
	const [size, setSize] = useState(init);
	const [isSliding, setIsSliding] = useState(false);
	const downPos = useRef(0);
	const startSize = useRef(size);

	useEffect(() => {
		const onMouseUp = () => {
			setIsSliding(false);
			document.body.style = "";
		};
		const onMouseMove = (e: MouseEvent) => {
			if (!isSliding)
				return;
			let delta;
			if (dir === "x")
				delta = (e.clientX - downPos.current) * scale;
			else
				delta = (e.clientY - downPos.current) * scale;
			setSize(Math.round(clamp(startSize.current + delta, min, max) * 100) / 100);
		};
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("mousemove", onMouseMove);
		return () => {
			window.removeEventListener("mouseup", onMouseUp);
			window.removeEventListener("mousemove", onMouseMove);
		}
	}, [isSliding]);

	return {
		size,
		onMouseDown: (e: React.MouseEvent) => {
			downPos.current = dir === "x" ? e.clientX : e.clientY;
			startSize.current = size;
			setIsSliding(true);
			document.body.style = "user-select: none; cursor:" + (dir === "x" ? "ew-resize" : "ns-resize");
		},
		set: (s: number) => {
			if (size !== s)
				setSize(clamp(s, min, max));
		}
	};
};