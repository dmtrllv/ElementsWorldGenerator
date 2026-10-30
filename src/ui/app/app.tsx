import { Notifications } from "./notification";
import { Sidebar } from "./sidebar";
import { Viewport } from "./viewport";
import { Topbar } from "./topbar";

import "./styles/app.scss";

export const App = () => {
	return (
		<>
			<Topbar />
			<div id="workarea">
				<Sidebar />
				<div id="viewport">
					<Viewport />
				</div>
				<Notifications />
			</div>
		</>
	);
};

