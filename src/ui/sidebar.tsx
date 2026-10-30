import { useState } from "react";
import { Editor } from "../editor";
import { Generator, WorldSettings } from "../editor/generator";
import { SettingsView } from "./components";
import { useSlider } from "./hooks/slider";
import { NotificationManager } from "../editor/notifications";
import { Biome } from "../editor/generator/biomes";
import { DropdownPanel } from "./components/dropdown";

import "./styles/sidebar.scss";

const World = () => {
	const generator = Editor.use(Generator);
	const notifications = Editor.use(NotificationManager);

	const generate = () => {
		try {
			generator.generate()
		} catch (e) {
			if (e instanceof Error) {
				notifications.notify({
					type: "Error",
					message: e.message,
					title: e.name
				});
				console.error(e);
			} else {
				throw e;
			}
		}
	}

	return (
		<>
			<SettingsView type={WorldSettings} settings={generator.worldSettings} />
			<button onClick={generate}>Generate</button>
		</>
	);
};

const Biomes = () => {
	const generator = Editor.use(Generator);

	return (
		<>
			{generator.biomes.getAll().map(biome => {
				const color = `rgb(${biome.color[0]},${biome.color[1]},${biome.color[2]})`;
				return (
					<DropdownPanel key={biome.name} title={<h4><div style={{ backgroundColor: color }} className="biome-color" />{biome.name}</h4>} open={false} >
						<SettingsView type={Biome} settings={biome} />
					</DropdownPanel>
				)
			})}
		</>
	);
};

const tabs = {
	World,
	Biomes
};

export const Sidebar = () => {
	const { size: width, onMouseDown } = useSlider(360, 320, 640, "x");

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
