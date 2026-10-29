import { Vector3 } from "three";
import type { Editor } from "../editor";
import { input, Settings } from "../settings";
import { randomSeed } from "../../utils";
import { store } from "../../state";
import { NumberInput, Vector3Input } from "../../ui/components";

@store
export class Generator {
	public readonly editor: Editor;

	public readonly worldSettings = new WorldSettings();

	public constructor(editor: Editor) {
		this.editor = editor;
	}
}

@store
export class WorldSettings extends Settings {
	@input(NumberInput, { step: 1 })
	public seed: number = randomSeed();
	
	@input(Vector3Input)
	public size: Vector3 = new Vector3(32, 32, 32);

	@input(NumberInput)
	public baseHeight: number = 0;

	@input(NumberInput)
	public continentalScale: number = 0;

	@input(NumberInput)
	public continentalStrength: number = 0;

	@input(NumberInput)
	public detailScale: number = 0;

	@input(NumberInput)
	public detailStrength: number = 0;

	@input(NumberInput)
	public roughnessScale: number = 0;

	@input(NumberInput)
	public roughnessStrength: number = 0;

	@input(NumberInput, { step: 1 })
	public seaLevel: number = 7;

	@input(NumberInput, { step: 1 })
	public biomeTemperatureScale: number = 0;
	
	@input(NumberInput, { step: 1 })
	public biomeMoistureScale: number = 0;
	
	@input(NumberInput, { step: 1 })
	public biomeElevationScale: number = 0;
}
