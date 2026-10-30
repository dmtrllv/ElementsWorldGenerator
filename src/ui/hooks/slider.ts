import { useState, useRef, useEffect } from "react";
import { clamp } from "../../utils";

export const useSlider = (init: number, min: number, max: number, dir: "x" | "y") => {
	const [size, setSize] = useState(init);
	const [isSliding, setIsSliding] = useState(false);
	const downPos = useRef(0);
	const startSize = useRef(size);

	useEffect(() => {
		const onMouseUp = () => setIsSliding(false);
		const onMouseMove = (e: MouseEvent) => {
			if (!isSliding)
				return;
			let delta;
			if (dir === "x")
				delta = e.clientX - downPos.current;
			else
				delta = e.clientY - downPos.current;
			setSize(clamp(startSize.current + delta, min, max));
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
		},
		set: (s: number) => {
			if(size !== s)
				setSize(s);
		}
	};
};