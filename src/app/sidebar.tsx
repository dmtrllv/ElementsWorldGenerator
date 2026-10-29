import { useEditor } from "./editor";
import { DEFAULT_GENERATION_SETTINGS, type GenerationSettings } from "../generator/settings";
import { randomSeed } from "../utils";
import { Form, number, text, dropdown, button, useFormSection, submit, reset, vector3 } from "./components";
import { useState } from "react";
import { Vector2, Vector3 } from "three";

//const getUrlSeed = () => {
//	const seed = Object.fromEntries(new URLSearchParams(location.search))["seed"];
//	if (seed)
//		return +seed;
//	return randomInt(1_000_000_000);
//};

//const setUrlSeed = (seed: number) => {
//	const url = new URL(window.location.href);
//	url.searchParams.set("seed", String(seed));
//	window.history.replaceState({}, "", url);
//};

const SAVES_ID = "world-editor.saves";

const loadSaves = (): Record<string, GenerationSettings> => {
	const settings = localStorage.getItem(SAVES_ID);
	if (!settings) {
		localStorage.setItem(SAVES_ID, JSON.stringify({}));
		return {};
	}
	return JSON.parse(settings);
};

const storeSaves = (saves: Record<string, GenerationSettings>) => {
	localStorage.setItem(SAVES_ID, JSON.stringify(saves));
}

export const Sidebar = () => {
	const editor = useEditor();

	const globalSettings = useFormSection("global", "Global Settings", {
		seed: number("Seed", DEFAULT_GENERATION_SETTINGS.seed, { min: -1_000_000_000, max: 1_000_000_000, step: 1 }),
		baseHeight: number("Base height", DEFAULT_GENERATION_SETTINGS.baseHeight, {}),
		size: vector3("Size", DEFAULT_GENERATION_SETTINGS.size),
		seaLevel: number("Sea level", DEFAULT_GENERATION_SETTINGS.seaLevel, {}),
		continentalScale: number("Continental scale", DEFAULT_GENERATION_SETTINGS.continentalScale, {}),
		continentalStrength: number("Continental strength", DEFAULT_GENERATION_SETTINGS.continentalStrength, {}),
		detailScale: number("Detail scale", DEFAULT_GENERATION_SETTINGS.detailScale, {}),
		detailStrength: number("Detail strength", DEFAULT_GENERATION_SETTINGS.detailStrength, {}),
		roughnessScale: number("Roughness scale", DEFAULT_GENERATION_SETTINGS.roughnessScale, {}),
		roughnessStrength: number("Roughness strength", DEFAULT_GENERATION_SETTINGS.roughnessStrength, {}),
		biomeTemperatureScale: number("Biome temperature scale", DEFAULT_GENERATION_SETTINGS.biomeTemperatureScale, {}),
		biomeMoistureScale: number("Biome moisture scale", DEFAULT_GENERATION_SETTINGS.biomeMoistureScale, {}),
		biomeElevationScale: number("Biome elevation scale", DEFAULT_GENERATION_SETTINGS.biomeElevationScale, {}),
		debugMode: dropdown("Debug mode", ["materials", "biomes"]),
		settingsName: text("Save name", DEFAULT_GENERATION_SETTINGS.seed.toString()),
		randomSeed: button("Random seed", () => {
			const seed = randomSeed();
			globalSettings.set("seed", seed);
			globalSettings.set("settingsName", seed.toString());
		}),
		submit: submit("Generate"),
		reset: reset("Reset")
	});

	const [saves, setSaves] = useState(loadSaves());

	const saveSettings = () => {
		const { settingsName, ...settings } = globalSettings.values();
		const newSaves = { ...saves, [settingsName]: settings };
		storeSaves(newSaves);
		setSaves(newSaves);
	};

	return (
		<div style={{ position: "absolute", overflowY: "auto", height: "100%", width: "100%" }}>

			<button onClick={saveSettings}>Save Settings</button>
			<h2>Saves:</h2>
			{Object.entries(saves).map(([k, v], i) => {
				return (
					<div key={i} onClick={() => globalSettings.update({ ...v, settingsName: k, size: new Vector3(v.size.x, v.size.y, v.size.z) } as any)}>
						{k}
					</div>
				)
			})}

			<Form sections={[globalSettings]} onSubmit={(s) => {
				editor.renderer.setDebugMode(s.global.debugMode as any);
				editor.renderer.render(editor.generator.generate(s.global))
			}} />
		</div>
	);
};