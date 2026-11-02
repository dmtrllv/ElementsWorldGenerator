import { useState } from "react";
import { useSlider } from "../hooks/slider";
import { Editor, ProjectManager } from "../../editor";
import { observe } from "../../state";
import { NumberInput, ScalarInput, Vector3Input } from "../components";
import { DropdownPanel } from "../components/dropdown";
import { VectorFieldInput } from "../components/vector-field-input";
import type { LatitudeAxis } from "../../generator/params";
import { MapInspectorWorkspace, WorkspaceManager } from "../../editor/workspace";
import { LatitudeMap } from "../../generator/maps/latitude-map";
import type { MapGenerator, MapGeneratorType } from "../../generator/maps/map";
import { CurveEditor } from "../components/curve-editor";
import { ElevationMap } from "../../generator";
import { Renderer } from "../../renderer";

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
	const geological = observe(world.geological);

	const project = Editor.useModule(ProjectManager).activeProject;
	const workspaces = Editor.useModule(WorkspaceManager);
	const renderer = Editor.useModule(Renderer);

	const generateAndOpen = (e: React.MouseEvent, name: string, type: MapGeneratorType<MapGenerator>, renderMesh: boolean) => {
		e.stopPropagation();
		e.preventDefault();
		const map = project.world.generator.generateMap(type, true);
		if (renderMesh)
			renderer.renderHeightmap(name, map, world.size.y);
		else
			workspaces.open(MapInspectorWorkspace, name, map);
	};

	const mapTitle = (title: string, type: MapGeneratorType<MapGenerator>, renderMesh: boolean) => {
		return (
			<h4>
				{title}
				<i onClick={(e) => generateAndOpen(e, title + " Map", type, renderMesh)} className="fa-solid fa-play" />
			</h4>
		);
	};

	return (
		<div className="world">
			<DropdownPanel title="World">
				<NumberInput name="seed" value={world.seed} onChange={v => world.seed = v} />
				<Vector3Input name="size" value={world.size} onChange={v => world.size = v} />
				<NumberInput name="chunkSize" value={world.chunkSize} onChange={v => world.chunkSize = v} />
			</DropdownPanel>
			<DropdownPanel title={mapTitle("Latitude", LatitudeMap, false)} open={false}>
				<div className="input-field">
					<div className="label">
						Equator Axis:
					</div>
					<select name="equator-axis" value={latitude.axis} onChange={e => latitude.axis = e.target.value as LatitudeAxis}>
						<option value="x">x</option>
						<option value="y">y</option>
					</select>
				</div>
				<NumberInput name="offset" value={latitude.offset} onChange={v => latitude.offset = v} />
				<NumberInput name="frequency" value={latitude.frequency} onChange={v => latitude.frequency = v} />
				<ScalarInput name="distortion" workspaceName="Latitude Distortion" value={latitude.distortion} />
			</DropdownPanel>
			<DropdownPanel title={mapTitle("Elevation", ElevationMap, true)} open={false}>
				<CurveEditor name="Base Profile" curve={elevation.base} />
				<ScalarInput name="Continentalness" workspaceName="Continentalness" value={elevation.continental} />
				<DropdownPanel title="Mountains" open={false}>
					<ScalarInput name="Mask" workspaceName="Mountain Mask" value={elevation.mountains} />
					<CurveEditor name="Profile" curve={elevation.mountainProfile} />
					<NumberInput name="Height" value={elevation.mountainHeight} onChange={v => elevation.mountainHeight = v} />
				</DropdownPanel>
				<DropdownPanel title="Hills" open={false}>
					<ScalarInput name="Mask" workspaceName="Hill Mask" value={elevation.hills} />
					<CurveEditor name="Profile" curve={elevation.hillProfile} />
					<NumberInput name="Height" value={elevation.hillHeight} onChange={v => elevation.hillHeight = v} />
				</DropdownPanel>
				<DropdownPanel title="Valleys" open={false}>
					<ScalarInput name="Mask" workspaceName="Valley Mask" value={elevation.valleys} />
					<CurveEditor name="Profile" curve={elevation.valleyProfile} />
					<NumberInput name="Depth" value={elevation.valleyDepth} onChange={v => elevation.valleyDepth = v} />
				</DropdownPanel>
				<DropdownPanel title="Plateaus" open={false}>
					<ScalarInput name="Mask" workspaceName="Plateau Mask" value={elevation.plateaus} />
					<CurveEditor name="Profile" curve={elevation.plateauProfile} />
					<NumberInput name="Height" value={elevation.plateauHeight} onChange={v => elevation.plateauHeight = v} />
				</DropdownPanel>
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
				<VectorFieldInput name="direction" workspaceName="Wind direction" value={wind.direction} />
				<NumberInput name="windVariation" value={wind.variation} onChange={v => ocean.seaLevelVariation = v} />
			</DropdownPanel>
			<DropdownPanel title="Temperature" open={false}>
				<NumberInput name="equatorTemperature" value={temperature.equatorTemperature} onChange={v => temperature.equatorTemperature = v} />
				<NumberInput name="poleTemperature" value={temperature.poleTemperature} onChange={v => temperature.poleTemperature = v} />
				<NumberInput name="falloff" value={temperature.falloff} onChange={v => temperature.falloff = v} />
				<NumberInput name="elevationCooling" value={temperature.elevationCooling} onChange={v => temperature.elevationCooling = v} />
			</DropdownPanel>
			<DropdownPanel title="Moisture" open={false}>
				<NumberInput name="humidityBase" value={moisture.humidityBase} onChange={v => moisture.humidityBase = v} />
				<NumberInput name="humidityStregnth" value={moisture.humidityStrength} onChange={v => moisture.humidityStrength = v} />
				<NumberInput name="evaporationStrength" value={moisture.evaporationStrength} onChange={v => moisture.evaporationStrength = v} />
				<NumberInput name="infiltration" value={moisture.infiltration} onChange={v => moisture.infiltration = v} />
				<NumberInput name="precipitationEfficiency" value={moisture.precipitationEfficiency} onChange={v => moisture.precipitationEfficiency = v} />
				<NumberInput name="groundWater" value={moisture.groundWater} onChange={v => moisture.groundWater = v} />
				<NumberInput name="runoff" value={moisture.runoff} onChange={v => moisture.runoff = v} />
				<NumberInput name="waterRetention" value={moisture.waterRetention} onChange={v => moisture.waterRetention = v} />
			</DropdownPanel>
			<DropdownPanel title="Geological" open={false}>
				<NumberInput name="tectonicActivity" value={geological.tectonicActivity} onChange={v => geological.tectonicActivity = v} />
				<NumberInput name="volcanicActivity" value={geological.volcanicActivity} onChange={v => geological.volcanicActivity = v} />
				<NumberInput name="erosionStrength" value={geological.erosionStrength} onChange={v => geological.erosionStrength = v} />
				<NumberInput name="bedrockHardness" value={geological.bedrockHardness} onChange={v => geological.bedrockHardness = v} />
			</DropdownPanel>
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
