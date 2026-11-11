import { Editor, ProjectManager } from "../../../editor";
import { useObservable } from "../../../reactive";
import { GroupInput } from "../../components/params/group-input";
import { DropdownPanel, NumberInput, Vector2Input, Vector3Input } from "../../components";

import "./styles/sidebar.scss";

export const WorldParams = () => {
	const manager = Editor.useModule(ProjectManager);
	const project = useObservable(manager.activeProject);
	const params = useObservable(project.world.worldParams);

	return (
		<div className="world-params">
			<DropdownPanel title="World">
				<NumberInput name="Seed" value={params.seed} onChange={v => params.seed = v} />
				<Vector3Input name="Size" value={params.size} onChange={v => params.size = v} />
				<NumberInput name="Chunk size" value={params.chunkSize} onChange={v => params.chunkSize = v} />
				<Vector2Input name="Offset" value={params.offset} onChange={v => params.offset = v} />
			</DropdownPanel>
			<GroupInput group={params.geography}/>
			<GroupInput group={params.terrain} />
		</div>
	);
};