import { useEffect, useRef } from "react";
import type { SceneView } from "../../editor/workspace";
//import { Editor } from "../../editor";

export const SceneViewWorkspace = ({ workspace } : { workspace: SceneView }) => {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		//const container = containerRef.current;
		//if (!container)
		//	return;

		//renderer.initialize(container);

		//return () => renderer.terminate();
	}, []);

	return (
		<div className="renderer" ref={containerRef} />
	);
};