import { useState } from "react";
import { useSlider } from "../hooks/slider";
import { Editor, ProjectManager } from "../../editor";
import { observe } from "../../state";
import { NumberInput, ScalarInput, Vector3Input } from "../components";
import { DropdownPanel } from "../components/dropdown";
import type { LatitudeAxis } from "../../generator/world";

import "./styles/sidebar.scss";

const World = () => {
	const manager = Editor.useModule(ProjectManager);
	const world = observe(manager.activeProject.world.params);
	const latitude = observe(world.latitude);
	const elevation = observe(world.elevation);
	const ocean = observe(world.ocean);
	const wind = observe(world.wind);
	const temperature = observe(world.temperature);
	const moisture = observe(world.moisture);
	return (
		<div className="world">
			<DropdownPanel title="World">
				<NumberInput name="seed" value={world.seed} onChange={v => world.seed = v} />
				<Vector3Input name="size" value={world.size} onChange={v => world.size = v} />
				<NumberInput name="chunkSize" value={world.chunkSize} onChange={v => world.chunkSize = v} />
			</DropdownPanel>
			<DropdownPanel title="Latitude" open={false}>
				<div className="input-field">
					<div className="label">
						Axis:
					</div>
					<select name="latitude-axis" value={latitude.axis} onChange={e => latitude.axis = e.target.value as LatitudeAxis}>
						<option value="x">x</option>
						<option value="y">y</option>
					</select>
				</div>
				<NumberInput name="offset" value={latitude.offset} onChange={v => latitude.offset = v} />
				<NumberInput name="stepDistance" value={latitude.stepDistance} onChange={v => latitude.stepDistance = v} />
				<ScalarInput name="distortion" value={latitude.distortion} />
			</DropdownPanel>
			<DropdownPanel title="Elevation" open={false}>
				<ScalarInput name="continental" value={elevation.continental} />
				<ScalarInput name="mountains" value={elevation.mountains} />
				<ScalarInput name="hills" value={elevation.hills} />
				<ScalarInput name="valleys" value={elevation.valleys} />
				<ScalarInput name="plateaus" value={elevation.plateaus} />
			</DropdownPanel>
			<DropdownPanel title="Ocean" open={false}>
				<NumberInput name="seaLevel" value={ocean.seaLevel} onChange={v => ocean.seaLevel = v} />
				<NumberInput name="seaLevelVariation" value={ocean.seaLevelVariation} onChange={v => ocean.seaLevelVariation = v} />
				<NumberInput name="scale" value={ocean.scale} onChange={v => ocean.scale = v} />
				<NumberInput name="depth" value={ocean.depth} onChange={v => ocean.depth = v} />
				<NumberInput name="coastFalloff" value={ocean.coastFalloff} onChange={v => ocean.coastFalloff = v} />
				<NumberInput name="coverage" value={ocean.coverage} onChange={v => ocean.coverage = v} />
			</DropdownPanel>
			<DropdownPanel title="Wind" open={false}>
				<ScalarInput name="direction" value={wind.direction}/>
				<NumberInput name="windVariation" value={wind.variation} onChange={v => ocean.seaLevelVariation = v} />
			</DropdownPanel>
			<DropdownPanel title="Temperature" open={false}>
				<NumberInput name="equatorTemperature" value={temperature.equatorTemperature} onChange={v => temperature.equatorTemperature = v} />
				<NumberInput name="poleTemperature" value={temperature.poleTemperature} onChange={v => temperature.poleTemperature = v} />
				<NumberInput name="falloff" value={temperature.falloff} onChange={v => temperature.falloff = v} />
				<NumberInput name="elevationCooling" value={temperature.elevationCooling} onChange={v => temperature.elevationCooling = v} />
			</DropdownPanel>
			<DropdownPanel title="Moisture" open={false}>
				<NumberInput name="humidity" value={moisture.humidity} onChange={v => moisture.humidity = v} />
				<NumberInput name="evaporationStrength" value={moisture.evaporationStrength} onChange={v => moisture.evaporationStrength = v} />
				<NumberInput name="precipitationEfficiency" value={moisture.precipitationEfficiency} onChange={v => moisture.precipitationEfficiency = v} />
			</DropdownPanel>
		</div>
	);
};

//const BiomeTitle = ({ biome }: { biome: Biome }) => {
//	const { color } = observe(biome);
//	const c = `rgb(${color[0]},${color[1]},${color[2]})`;

//	return (
//		<h4><div style={{ backgroundColor: c }} className="biome-color" />{biome.name}</h4>
//	)
//}

const Biomes = () => {
	//const generator = Editor.useStore(Generator);
	//const biomes = observe(generator.biomes.biomes);
	return (
		<>
			{/*{biomes.map(biome => {
				return (
					<DropdownPanel key={biome.name} title={<BiomeTitle biome={biome} />} open={false} >
						<SettingsView type={Biome} settings={biome} />
					</DropdownPanel>
				)
			})}*/}
		</>
	);
};

const tabs = {
	World,
	Biomes
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
