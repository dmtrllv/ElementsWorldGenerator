import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { Viewport } from "./viewport";
import { clamp } from "../../src/utils";

import "./styles/app.scss";
import { Notifications } from "./notification";

export const App = () => {
	const { width, onMouseDown } = useSlider(360, 320, 640);
	return (
		<div id="app">
			<div id="sidebar" style={{ flexBasis: width }}>
				<Sidebar />
				<div className="slider" onMouseDown={onMouseDown} />
			</div>
			<div id="viewport">
				<Viewport />
			</div>
			<Notifications />
		</div>
	);
};

const useSlider = (init: number, min: number, max: number) => {
	const [width, setWidth] = useState(init);
	const [isSliding, setIsSliding] = useState(false);
	const downPos = useRef(0);
	const startWidth = useRef(width);

	useEffect(() => {
		const onMouseUp = () => setIsSliding(false);
		const onMouseMove = (e: MouseEvent) => {
			if (!isSliding)
				return;
			const delta = e.clientX - downPos.current;
			setWidth(clamp(startWidth.current + delta, min, max));
		};
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("mousemove", onMouseMove);
		return () => {
			window.removeEventListener("mouseup", onMouseUp);
			window.removeEventListener("mousemove", onMouseMove);
		}
	}, [isSliding]);

	return {
		width,
		onMouseDown: (e: React.MouseEvent) => {
			downPos.current = e.clientX;
			startWidth.current = width;
			setIsSliding(true);
		}
	}
}