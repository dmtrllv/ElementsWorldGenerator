import { WorldDebugWorkspace } from "../../../editor";
import { WorkspaceManager } from "../../../editor/workspace";

export const Debug = () => {
	const manager = WorkspaceManager.use();

	return (
		<div className="debug">
			<button onClick={() => manager.open(WorldDebugWorkspace, "World Debugger")}>Debug World Map</button>
		</div>
	);
};