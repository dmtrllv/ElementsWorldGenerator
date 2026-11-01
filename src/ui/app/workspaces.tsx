import { Editor } from "../../editor";
import { CurveEditorWorkspace, MapInspectorWorkspace, ScalarWorkspace, SceneWorkspace, VectorFieldWorkspace, Workspace, WorkspaceManager, type WorkspaceType } from "../../editor/workspace";
import { ScalarView, SceneViewWorkspace, VectorFieldView } from "./workspaces/index";

import "./styles/workspace.scss";
import { MapInspector } from "./workspaces/map-inspector";
import { CurveWorkspaceView } from "./workspaces/curve-view";

export const Workspaces = () => {
	const workspace = Editor.useModule(WorkspaceManager);

	return (
		<div id="workspace">
			<div className="tabs">
				{workspace.workspaces.map(w => (
					<div key={w.id} className={`tab ${workspace.activeWorkspace.id === w.id ? "active" : ""}`} onClick={() => workspace.focus(w)}>
						{w.name}
						{w.isClosable && <div className="btn-close" onClick={() => workspace.close(w)}><i className="fa-solid fa-xmark"></i></div>}
					</div>
				))}
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

register(SceneWorkspace, SceneViewWorkspace);
register(ScalarWorkspace, ScalarView);
register(VectorFieldWorkspace, VectorFieldView);
register(MapInspectorWorkspace, MapInspector);
register(CurveEditorWorkspace, CurveWorkspaceView);