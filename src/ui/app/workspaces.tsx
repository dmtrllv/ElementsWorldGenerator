import { Editor } from "../../editor";
import { SceneView, Workspace, WorkspaceManager, type WorkspaceType } from "../../editor/workspace";
import { SceneViewWorkspace } from "./scene-view";

import "./styles/workspace.scss";

export const Workspaces = () => {
	const workspace = Editor.useModule(WorkspaceManager);

	return (
		<div id="workspace">
			<div className="tabs">
				{workspace.workspaces.map(w => <div key={w.id} className={`tab ${workspace.activeWorkspace.id === w.id ? "active" : ""}`}>{w.name}</div>)}
			</div>
			<div className="workarea">
				{workspace.workspaces.map(w => {
					const Component = WorkspaceComponents[w.constructor.name];
					if (!Component) {
						console.warn(`Could not find component for ${w.constructor.name}!`);
						return null;
					}
					return (
						<div key={w.id} className={`workspace-view ${workspace.activeWorkspace.id === w.id ? "active" : ""}`}>
							<Component workspace={w} />
						</div>
					);
				})}
			</div>
		</div>
	);
};

const WorkspaceComponents: Record<string, React.FC<{ workspace: any }>> = {};

const register = <T extends Workspace>(type: WorkspaceType<T>, component: React.FC<{ workspace: T }>) => {
	if (type.name in WorkspaceComponents)
		throw new Error(`Component for ${type.name} is already registered!`);
	WorkspaceComponents[type.name] = component;
};

register(SceneView, SceneViewWorkspace);