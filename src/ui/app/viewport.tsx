import { useEffect, useRef } from "react";
import { Editor, Renderer } from "../../editor";

export const Viewport = () => {
	const renderer = Editor.use(Renderer);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container)
			return;

		renderer.initialize(container);

		return () => renderer.terminate();
	}, []);

	return (
		<div className="renderer" ref={containerRef} />
	);
};