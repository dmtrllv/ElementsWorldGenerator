//import { Editor, NotificationManager } from "../../editor";
import { Menubar } from "./menubar";

import "./styles/topbar.scss";

export const Topbar = () => {
	//const generator = Editor.useStore(Generator);
	//const notifications = Editor.useModule(NotificationManager);
	//const renderer = Editor.useStore(Renderer);

	//const generate = async () => {
		//try {
		//	await generator.generate();
		//} catch (e) {
		//	if (e instanceof Error) {
		//		notifications.notify({
		//			type: "Error",
		//			message: e.message,
		//			title: e.name
		//		});
		//		console.error(e);
		//	} else {
		//		throw e;
		//	}
		//}
	//};

	return (
		<div id="topbar">
			<Menubar />
			<div className="right">
				<div className="camera-mode">
					{/*<div className={`btn ${renderer.cameraMode === "orbital" ? "active" : ""}`} onClick={() => renderer.setCameraMode("orbital")}>
						<i className="fa-solid fa-arrows-spin">
						</i>
					</div>
					<div className={`btn ${renderer.cameraMode === "first-person" ? "active" : ""}`} onClick={() => renderer.setCameraMode("first-person")}>
						<i className="fa-solid fa-street-view">
						</i>
					</div>*/}
				</div>
				<div className="render-mode">
					{/*<label>auto generate</label><input type="checkbox" checked={generator.chunkGenerationEnabled} onChange={e => generator.chunkGenerationEnabled = e.target.checked} />
					<select name="render-mode" id="pet-select" value={renderer.renderMode.toString()} onChange={e => renderer.setRenderMode(e.target.value as TerrainRenderMode)}>
						<option value="materials">Materials</option>
						<option value="biomes">Biomes</option>
					</select>*/}
				</div>
				{/*<button className="btn-generate" onClick={generate}>Generate</button>*/}
			</div>
		</div>
	);
};