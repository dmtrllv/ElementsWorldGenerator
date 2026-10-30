import { Editor, Generator, NotificationManager, Renderer, type TerrainRenderMode } from "../../editor";

import "./styles/topbar.scss";

export const Topbar = () => {
	const generator = Editor.use(Generator);
	const notifications = Editor.use(NotificationManager);
	const renderer = Editor.use(Renderer);

	const generate = () => {
		try {
			generator.generate();
		} catch (e) {
			if (e instanceof Error) {
				notifications.notify({
					type: "Error",
					message: e.message,
					title: e.name
				});
				console.error(e);
			} else {
				throw e;
			}
		}
	};

	return (
		<div id="topbar">
			<div className="right">
				<div className="render-mode">
					<select name="render-mode" id="pet-select" value={renderer.renderMode.toString()} onChange={e => renderer.setRenderMode(e.target.value as TerrainRenderMode)}>
						<option value="materials">Materials</option>
						<option value="biomes">Biomes</option>
					</select>
				</div>
				<button className="btn-generate" onClick={generate}>Generate</button>
			</div>
		</div>
	);
};