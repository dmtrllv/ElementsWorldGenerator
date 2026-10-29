import { useEffect, useRef } from "react";
import { useEditor } from "./editor";

export const Viewport = () => {
	const editor = useEditor();
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container)
			return;

		editor.renderer.initialize(container);

		return () => editor.renderer.terminate();
	}, [editor.renderer]);

	return (
		<div className="renderer" ref={containerRef} />
	);
};