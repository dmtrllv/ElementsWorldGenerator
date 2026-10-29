import { useState } from "react";
import { useEditor } from "./editor";
import { Vector3 } from "three";
import { Generator } from "../generator";
import { DEFAULT_GENERATION_SETTINGS } from "../generator/settings";

const getUrlSeed = () => {
	const seed = Object.fromEntries(new URLSearchParams(location.search))["seed"];
	if (seed)
		return +seed;
	return random();
};

const random = () => Math.floor((Math.random() - 1) * 1000000000);

const setUrlSeed = (seed: number) => {
	const url = new URL(window.location.href);
	url.searchParams.set("seed", String(seed));
	window.history.replaceState({}, "", url);
}

export const Sidebar = () => {
	const editor = useEditor();

	const [seed, setSeed] = useState(getUrlSeed());
	const [size, setSize] = useState(DEFAULT_GENERATION_SETTINGS.size);
	const [baseHeight, setBaseHeight] = useState(DEFAULT_GENERATION_SETTINGS.baseHeight);
	const [seaLevel, setSeaLevel] = useState(DEFAULT_GENERATION_SETTINGS.seaLevel);
	const [continentalScale, setContinentalScale] = useState(DEFAULT_GENERATION_SETTINGS.continentalScale);
	const [continentalStrength, setContinentalStrength] = useState(DEFAULT_GENERATION_SETTINGS.continentalStrength);
	const [detailScale, setDetailScale] = useState(DEFAULT_GENERATION_SETTINGS.detailScale);
	const [detailStrength, setDetailStrength] = useState(DEFAULT_GENERATION_SETTINGS.detailStrength);
	const [roughnessScale, setRoughnessScale] = useState(DEFAULT_GENERATION_SETTINGS.roughnessScale);
	const [roughnessStrength, setRoughnessStrength] = useState(DEFAULT_GENERATION_SETTINGS.roughnessStrength);
	const [debugMode, setDebugMode] = useState<"materials" | "biomes">("materials");

	setUrlSeed(seed);

	const generate = (s: number = seed) => {
		const world = editor.generator.generate({
			seed: s,
			size,
			baseHeight,
			seaLevel,
			continentalScale,
			continentalStrength,
			detailScale,
			detailStrength,
			roughnessScale,
			roughnessStrength,
		});
		editor.renderer.render(world);
	};

	const reset = () => {
		setSize(DEFAULT_GENERATION_SETTINGS.size);
		setBaseHeight(DEFAULT_GENERATION_SETTINGS.baseHeight);
		setSeaLevel(DEFAULT_GENERATION_SETTINGS.seaLevel);
		setContinentalScale(DEFAULT_GENERATION_SETTINGS.continentalScale);
		setContinentalStrength(DEFAULT_GENERATION_SETTINGS.continentalStrength);
		setDetailScale(DEFAULT_GENERATION_SETTINGS.detailScale);
		setDetailStrength(DEFAULT_GENERATION_SETTINGS.detailStrength);
		setRoughnessScale(DEFAULT_GENERATION_SETTINGS.roughnessScale);
		setRoughnessStrength(DEFAULT_GENERATION_SETTINGS.roughnessStrength);
	}

	return (
		<div>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>seed:</span>
				<input type="number" value={seed} onChange={(e) => setSeed(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>size:</span>
				<input placeholder="size" type="number" value={size.x} onChange={(e) => setSize(new Vector3(+e.target.value, size.y, +e.target.value))} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>height:</span>
				<input placeholder="height" type="number" value={size.y} onChange={(e) => setSize(new Vector3(size.x, +e.target.value, size.y))} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>baseHeight:</span>
				<input placeholder="baseHeight" type="number" value={baseHeight} onChange={(e) => setBaseHeight(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>seaLevel:</span>
				<input placeholder="seaLevel" type="number" value={seaLevel} onChange={(e) => setSeaLevel(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>continentalScale:</span>
				<input placeholder="continentalScale" type="number" value={continentalScale} onChange={(e) => setContinentalScale(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>continentalStrength:</span>
				<input placeholder="continentalStrength" type="number" value={continentalStrength} onChange={(e) => setContinentalStrength(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>detailScale:</span>
				<input placeholder="detailScale" type="number" value={detailScale} onChange={(e) => setDetailScale(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>detailStrength:</span>
				<input placeholder="detailStrength" type="number" value={detailStrength} onChange={(e) => setDetailStrength(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>roughnessScale:</span>
				<input placeholder="roughnessScale" type="number" value={roughnessScale} onChange={(e) => setRoughnessScale(+e.target.value)} />
			</p>
			<p>
				<span style={{ width: "120px", display: "inline-block", textAlign: "right", paddingRight: "5px" }}>roughnessStrength:</span>
				<input placeholder="roughnessStrength" type="number" value={roughnessStrength} onChange={(e) => setRoughnessStrength(+e.target.value)} />
			</p>
			<p>
				<label htmlFor="debug-mode">Debug view:</label>
				<select id="debug-mode" value={debugMode} onChange={(e) => {
					const mode = e.target.value as "materials" | "biomes";
					setDebugMode(mode);
					editor.renderer.setDebugMode(mode);
				}}>
					<option value="materials">Normal materials</option>
					<option value="biomes">Biome colors</option>
				</select>
			</p>
			<button onClick={_ => generate()}>Generate</button>
			<button onClick={() => { const seed = random(); setSeed(seed); generate(seed); }}>Generate (Random seed)</button>
			<button onClick={reset}>Reset Settings</button>
		</div>
	);
};