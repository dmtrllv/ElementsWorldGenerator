import { Editor } from "../editor";
import { Generator, WorldSettings } from "../editor/generator";
import { NotificationManager } from "../editor/notifications";
import { SettingsView } from "./components";
import { useSlider } from "./hooks/slider";
import { Notifications } from "./notification";

import "./styles/app.scss";

export const App = () => {
	const notifications = Editor.use(NotificationManager);
	const test = () => {
		notifications.notify({
			message: "Test",
			title: "Title",
			type: "Error"
		})
	};
	return (
		<>
			<Sidebar />
			<div id="viewport">
				<button onClick={test}>Test</button>
				{/*<Viewport />*/}
			</div>
			<Notifications />
		</>
	);
};


export const Sidebar = () => {
	const generator = Editor.use(Generator);
	const { width, onMouseDown } = useSlider(360, 320, 640, "x");
	return (
		<div id="sidebar" style={{ flexBasis: width }}>
			<SettingsView type={WorldSettings} settings={generator.worldSettings} />
			<div className="slider" onMouseDown={onMouseDown} />
		</div>
	);
}
