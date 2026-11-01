import { useEffect, useRef } from "react";
import type { SceneWorkspace } from "../../../editor/workspace";
import { Editor } from "../../../editor";
import { Renderer } from "../../../renderer";

export const SceneViewWorkspace = (_ : { workspace: SceneWorkspace }) => {
	const renderer = Editor.useModule(Renderer);                        
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = containerRef.current;
		if (!element)
			return;

		renderer.initialize(element);

		return () => renderer.dispose();
	}, []);

	return (
		<div className="renderer" ref={containerRef} />
	);
};