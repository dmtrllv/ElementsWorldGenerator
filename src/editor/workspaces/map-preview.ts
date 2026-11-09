import { MapData, type MapDataMeta, type MapDataType } from "../../generator";
import { observable } from "../../reactive";
import { Workspace, WorkspaceLayout, WorkspaceManager } from "../workspace";

@observable
export class MapPreviewWorkspace extends Workspace {
	public readonly meta: MapDataMeta<any>;
	public readonly type: MapDataType<any, any>;

	@observable
	public offset: [number, number] = [0, 0];

	@observable
	public scale: number = 1;

	public constructor(workspace: WorkspaceManager, layout: WorkspaceLayout | null, id: number, name: string, type: MapDataType<any, any>) {
		super(workspace, layout, id, name, true, true);
		this.type = type;
		this.meta = MapData.getMeta(type);
	}
}
