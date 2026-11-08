import { MapData, type MapDataMeta, type MapDataType } from "../../generator";
import { Workspace, WorkspaceLayout, WorkspaceManager } from "../workspace";

export class MapPreviewWorkspace extends Workspace {
	public readonly meta: MapDataMeta<any>;
	public readonly type: MapDataType<any>;

	public constructor(workspace: WorkspaceManager, layout: WorkspaceLayout | null, id: number, name: string, type: MapDataType<any>) {
		super(workspace, layout, id, name, true, true);
		this.type = type;
		this.meta = MapData.getMeta(type);
	}
}
