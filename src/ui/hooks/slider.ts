import { useState, useEffect } from "react";
import { clamp } from "../../utils";

export const useSlider = (init: number, min: number, max: number, dir: "x" | "y", scale: number = 1) => {
	const [size, setSize] = useState(init);
	const [isSliding, setIsSliding] = useState(false);

	useEffect(() => {
		const onMouseUp = () => {
			setIsSliding(false);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";

			if (document.pointerLockElement)
				document.exitPointerLock();
		};

		const onMouseMove = (e: MouseEvent) => {
			if (!isSliding)
				return;

			const delta = (dir === "x" ? e.movementX : e.movementY) * scale;

			if (delta === 0)
				return;

			setSize(s => Math.round(clamp(s + delta, min, max) * 100) / 100);
		};

		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("mousemove", onMouseMove);

		return () => {
			window.removeEventListener("mouseup", onMouseUp);
			window.removeEventListener("mousemove", onMouseMove);
		};
	}, [isSliding, dir, min, max, scale]);

	return {
		size,
		onMouseDown: (e: React.MouseEvent) => {
			setIsSliding(true);

			document.body.style.userSelect = "none";
			document.body.style.cursor = dir === "x" ? "ew-resize" : "ns-resize";

			e.currentTarget.requestPointerLock();
		},
		set: (s: number) => {
			if (size !== s)
				setSize(clamp(s, min, max));
		}
	};
};
