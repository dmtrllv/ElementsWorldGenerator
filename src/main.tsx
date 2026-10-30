import { createRoot } from "react-dom/client";
import { App } from "./ui";
import { EditorContext } from "./editor";

createRoot(document.getElementById("root")!).render(
	<EditorContext>
		<App />
	</EditorContext>
);

if (import.meta.hot) {
	import.meta.hot.on("vite:beforeUpdate", () => {
		console.clear();
	});
}