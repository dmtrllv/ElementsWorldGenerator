import { Workspace, WorkspaceManager, WorkspaceLayout } from "../workspace";

export class RendererWorkspace extends Workspace {
	public constructor(workspace: WorkspaceManager, layout: WorkspaceLayout | null, id: number, name: string) {
		super(workspace, layout, id, name, false, true);
	}
}