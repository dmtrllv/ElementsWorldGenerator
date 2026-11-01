import { Notifications } from "./notification";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Modals } from "./modals";
import { Workspaces } from "./workspaces";

import "./styles/app.scss";

export const App = () => {
	return (
		<>
			<Topbar />
			<div id="editor-workarea">
				<Sidebar />
				<Workspaces />
				<Modals />
				<Notifications />
			</div>
		</>
	);
};

