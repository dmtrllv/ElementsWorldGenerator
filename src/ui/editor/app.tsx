import { Notifications } from "./notification";
import { Sidebar } from "./sidebar/sidebar";
import { Topbar } from "./topbar";
import { Modals } from "./modals";
import { Workspaces } from "./workspaces";
import { Editor } from "../../editor";
import { useObservable } from "../../reactive";
import { Spinner } from "../components/spinner";
import { useEffect } from "react";
import { Renderer } from "../../renderer";

import "./styles/app.scss";

export const App = () => {
	const editor = useObservable(Editor.useContext());
	const renderer = Renderer.use();
	console.log(renderer.isInitialized);

	useEffect(() => {
		editor.initialize();
	}, []);

	return (
		<>
			{editor.isInitialized && (
				<>
					<Topbar />
					<div id="editor-workarea">
						<Sidebar />
						<Workspaces />
						<Modals />
						<Notifications />
					</div>
				</>
			)}
			<div className={`init-overlay ${editor.isInitialized && renderer.isInitialized ? "hidden" : ""}`}>
				<Spinner />
			</div>
		</>
	);
};

