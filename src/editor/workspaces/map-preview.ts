import { Workspace, WorkspaceLayout, WorkspaceManager } from "../workspace";

export class MapPreviewWorkspace extends Workspace {
	
	public constructor(workspace: WorkspaceManager, layout: WorkspaceLayout | null, id: number, name: string) {
		super(workspace, layout, id, name, false, true);
	}
}
