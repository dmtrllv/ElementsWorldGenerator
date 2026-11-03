import type { ParamGroup } from "../../generator/param-groups/param-group";
import { createObservable } from "../../reactive";
import { Workspace, WorkspaceLayout, WorkspaceManager } from "../workspace";

export class ParamGroupWorkspace extends Workspace {
	
	public readonly paramGroup: ParamGroup<any>;
	
	public constructor(workspace: WorkspaceManager, layout: WorkspaceLayout | null, id: number, name: string, paramGroup: ParamGroup<any>) {
		super(workspace, layout, id, name, false, true);
		this.paramGroup = createObservable(paramGroup);
	}
}
