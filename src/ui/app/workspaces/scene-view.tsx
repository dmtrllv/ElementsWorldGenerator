import { useEffect, useRef } from "react";
import type { SceneWorkspace } from "../../../editor/workspace";
import { Editor } from "../../../editor";

export const SceneViewWorkspace = (_: { workspace: SceneWorkspace }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const editor = Editor.useContext();

	useEffect(() => {
		let closed = false;
		let renderer: any;
		import("../../../renderer").then(({ Renderer }) => {
			const element = containerRef.current;
			if (!element || closed)
				return;

			renderer = editor.get(Renderer)
			renderer.initialize(element);

		});
		return () => {
			closed = true;
			renderer?.dispose()
		};
	}, []);

	return (
		<div className="renderer" ref={containerRef} />
	);
};