import { useState } from "react";
import { useSlider } from "../hooks/slider";

import "./styles/sidebar.scss";

const World = () => {
	//const manager = Editor.useModule(ProjectManager);

	return (
		null
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
		<div id="sidebar" style={{ flexBasis: width }}>
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
