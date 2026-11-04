import { createRoot } from "react-dom/client";
import { App } from "./ui";
import { type Editor, EditorContext } from "./editor";
import { WorkspaceManager } from "./editor/workspace";
import { RendererWorkspace } from "./editor/workspaces/renderer";

const init = (editor: Editor) => {
	editor.get(WorkspaceManager).open(RendererWorkspace, "Renderer");
};

createRoot(document.getElementById("root")!).render(
	<EditorContext init={init}>
		<App />
	</EditorContext>
);

if (import.meta.hot) {
	import.meta.hot.on("vite:beforeUpdate", () => {
		console.clear();
	});
}