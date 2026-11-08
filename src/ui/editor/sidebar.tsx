import { useMemo, useState } from "react";
import { useSlider } from "../hooks/slider";
import { Editor, ProjectManager } from "../../editor";
import { useObservable } from "../../reactive";
import { GroupInput } from "../components/params/group-input";
import { DropdownPanel, NumberInput, Vector2Input, Vector3Input } from "../components";
import { WorkspaceManager } from "../../editor/workspace";
import { MapPreviewWorkspace } from "../../editor/workspaces/map-preview";
import { MapData, Pass, type MapDataType, type PassMeta, type PassType } from "../../generator";
import { ParamGroup } from "../../generator/param-groups";

import "./styles/sidebar.scss";

const World = () => {
	const manager = Editor.useModule(ProjectManager);
	const project = useObservable(manager.activeProject);
	const params = useObservable(project.world.worldParams);

	return (
		<div className="world-params">
			<DropdownPanel title="World">
				<NumberInput name="Seed" value={params.seed} onChange={v => params.seed = v} />
				<Vector3Input name="Size" value={params.size} onChange={v => params.size = v} />
				<Vector2Input name="Chunk size" value={params.chunkSize} onChange={v => params.chunkSize = v} />
			</DropdownPanel>
			<GroupInput group={params.geography} />
		</div>
	);
};

const Debug = () => {
	const passes = useMemo(() => Array.from(Pass.getMeta().entries()), []);

	return (
		<div className="debug">
			{passes.map(([type, meta]) => <PassDebug key={type.name} type={type} meta={meta} />)}
		</div>
	);
}

const isMapDataType = (type: any): type is MapDataType<any> => {
	return type.prototype instanceof MapData;
}

const PassDebug = ({ type, meta }: { type: PassType<any>, meta: PassMeta }) => {
	const w = Editor.useModule(WorkspaceManager);

	const params = useMemo(() => {
		return Array.from(Object.entries(meta.dependencies)).filter(([_, meta]) => !isMapDataType(meta.type));
	}, [meta.dependencies]);

	const mapDependencies = useMemo(() => {
		return Array.from(Object.entries(meta.dependencies)).filter(([_, meta]) => isMapDataType(meta.type));
	}, [meta.dependencies]);

	const outputs = useMemo(() => Array.from(Object.entries(meta.outputs)), [meta.dependencies]);

	const openMap = (type: MapDataType<any>) => (_: React.MouseEvent) => {
		const meta = MapData.getMeta(type);
		w.open(MapPreviewWorkspace, `${meta.name} Debug Map`, type);
	};

	return (
		<DropdownPanel title={type.name} open={false}>
			{params.length > 0 && (
				<div>
					<h5>Input Params:</h5>
					{params.map(([key, param]) => {
						const meta = ParamGroup.getMeta(param.type as any);
						return (
							<div key={key}>{meta.name}</div>
						)
					})}
				</div>
			)}
			{mapDependencies.length > 0 && (
				<div>
					<h5>Input maps:</h5>
					{mapDependencies.map(([key]) => {
						return (
							<div key={key}>{key}</div>
						)
					})}
				</div>
			)}
			{outputs.length === 0 ? (
				<div>
					<h5>Output Error</h5>
					<div>Missing output in pass {type.name}!</div>
				</div>
			) : (
				<div>
					<h5>Output maps:</h5>
					{outputs.map(([key, type]) => {
						return (
							<div key={key} style={{ position: "relative", padding: "5px", width: "100%" }}>
								<span>{key}</span>
								<button style={{ position: "absolute", right: "0px" }} onClick={openMap(type)}>
									Debug
								</button>
							</div>
						);
					})}
				</div>
			)}
		</DropdownPanel>
	);
}

const Biomes = () => {
	return null;
};

const tabs = {
	World,
	Debug,
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
