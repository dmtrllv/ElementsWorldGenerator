import { Vector3 } from "three";
import { store } from "../../state";
import { NumberInput, Vector3Input } from "../../ui/components";
import { randomSeed } from "../../utils";
import { serializable } from "../serializer";
import { Settings, section, input, Vector3Serializer } from "../settings";

@store
export class WorldSettings extends Settings {
	@section("World Settings")
	@input(NumberInput, { step: 1 })
	@serializable()
	public seed: number = randomSeed();

	@input(Vector3Input)
	@serializable(Vector3, Vector3Serializer)
	public size: Vector3 = new Vector3(32, 32, 32);

	@input(NumberInput)
	@serializable()
	public chunkSize: number = 16;

	@input(NumberInput)
	@serializable()
	public baseHeight: number = 12;

	@input(NumberInput, { step: 1 })
	@serializable()
	public seaLevel: number = 7;


	@section("World Scales")
	@input(NumberInput)
	@serializable()
	public continentalScale: number = 96;

	@input(NumberInput)
	@serializable()
	public continentalStrength: number = 12;

	@input(NumberInput)
	@serializable()
	public detailScale: number = 87 / 2.5;

	@input(NumberInput)
	@serializable()
	public detailStrength: number = 4;

	@input(NumberInput)
	@serializable()
	public roughnessScale: number = 87 / 2;

	@input(NumberInput)
	@serializable()
	public roughnessStrength: number = 1.2;


	@section("Biome Scales")
	@input(NumberInput, { step: 1 })
	@serializable()
	public biomeTemperatureScale: number = 192;

	@input(NumberInput, { step: 1 })
	@serializable()
	public biomeMoistureScale: number = 148;

	@input(NumberInput, { step: 1 })
	@serializable()
	public biomeElevationScale: number = 256;
}
