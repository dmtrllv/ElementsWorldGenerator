import { useState } from "react";
import { useSlider } from "../hooks/slider";
import { Editor, ProjectManager } from "../../editor";
import { useObservable } from "../../reactive";
import { GroupInput } from "../components/params/group-input";
import { DropdownPanel, NumberInput, Vector2Input, Vector3Input } from "../components";
import { WorkspaceManager } from "../../editor/workspace";
import { MapPreviewWorkspace } from "../../editor/workspaces/map-preview";

import "./styles/sidebar.scss";

const World = () => {
	const manager = Editor.useModule(ProjectManager);
	const w = Editor.useModule(WorkspaceManager);
	const project = useObservable(manager.activeProject);
	const params = useObservable(project.world.worldParams);

	return (
		<div>
			<DropdownPanel title="World">
				<NumberInput name="Seed" value={params.seed} onChange={v => params.seed = v} />
				<Vector3Input name="Size" value={params.size} onChange={v => params.size = v} />
				<Vector2Input name="Chunk size" value={params.chunkSize} onChange={v => params.chunkSize = v} />
			</DropdownPanel>
			<GroupInput group={params.geography} />
			{/*<GroupInput group={params.terrain} />*/}

			<button onClick={() => {
				w.open(MapPreviewWorkspace, "Continental")
			}}>Test</button>
		</div>
	);
};

const Biomes = () => {
	return null;
};

const tabs = {
	World,
	Biomes,
};

export const Sidebar = () => {
	const { size: width, onMouseDown } = useSlider(420, 320, 860, "x");

	const [activeTab, setActiveTab] = useState("World");

	return (
		<div id="sidebar" style={{ flexBasis: width, minWidth: width, maxWidth: width }}>
			<div className="content">
				{Object.keys(tabs).map((key) => {
					const Component = tabs[key as keyof typeof tabs]!;
					const c = key === activeTab ? "active" : "";
					return (
						<div key={key} className={`tab-body ${c}`}>
							<Component />
						</div>
					);
				})}
			</div>
			<div className="tabs">
				{Object.keys(tabs).map((key) => (
					<div className={`tab ${key === activeTab ? "active" : ""}`} key={key} onClick={() => setActiveTab(key)}>
						<div className="tab-wrapper">
							{key}
						</div>
					</div>
				))}
			</div>
			<div className="slider" onMouseDown={onMouseDown} />
		</div>
	);
};
