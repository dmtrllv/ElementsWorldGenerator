import { useState } from "react";
import { Editor, Generator } from "../../editor";
import { Biome } from "../../editor/generator/biomes";
import { SettingsView } from "../components";
import { DropdownPanel } from "../components/dropdown";
import { useSlider } from "../hooks/slider";
import { observe } from "../../state";
import { WorldSettings } from "../../editor/generator/world-settings";

import "./styles/sidebar.scss";

const World = () => {
	const generator = Editor.use(Generator);
	return (
		<SettingsView type={WorldSettings} settings={generator.worldSettings} />
	);
};

const BiomeTitle = ({ biome }: { biome: Biome }) => {
	const { color } = observe(biome);
	const c = `rgb(${color[0]},${color[1]},${color[2]})`;

	return (
		<h4><div style={{ backgroundColor: c }} className="biome-color" />{biome.name}</h4>
	)
}

const Biomes = () => {
	const generator = Editor.use(Generator);
	const biomes = observe(generator.biomes.biomes);
	console.log("biomes changed!", biomes);
	return (
		<>
			{biomes.map(biome => {
				return (
					<DropdownPanel key={biome.name} title={<BiomeTitle biome={biome} />} open={false} >
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
