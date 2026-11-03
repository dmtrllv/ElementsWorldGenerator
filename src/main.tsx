//import { createRoot } from "react-dom/client";
//import { App } from "./ui";
//import { EditorContext } from "./editor";

import { createObservable, observable, subscribe } from "./reactive";

//createRoot(document.getElementById("root")!).render(
//	<EditorContext>
//		<App />
//	</EditorContext>
//);

//if (import.meta.hot) {
//	import.meta.hot.on("vite:beforeUpdate", () => {
//		console.clear();
//	});
//}

const state = createObservable({
	value: 0,
	name: "Example"
});

subscribe(state, "value", value => console.log(value));

state.value++;