import { Editor } from "../editor";
import { NotificationManager } from "../editor/notifications";
import { Notifications } from "./notification";
import { Sidebar } from "./sidebar";
import { Viewport } from "./viewport";

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
				<Viewport />
			</div>
			<Notifications />
		</>
	);
};

