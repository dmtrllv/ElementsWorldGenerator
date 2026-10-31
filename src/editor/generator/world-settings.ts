import { Vector3 } from "three";
import { store } from "../../state";
import { randomSeed } from "../../utils";
import { serializable } from "../serializer";
import { Settings, section, input, Vector3Serializer } from "../settings";

@store
export class WorldSettings extends Settings {
	@section("World Settings")
	@input("number", { step: 1 })
	@serializable()
	public seed: number = randomSeed();

	@input("vec3")
	@serializable(Vector3, Vector3Serializer)
	public size: Vector3 = new Vector3(32, 32, 32);

	@input("number")
	@serializable()
	public chunkSize: number = 16;

	@input("number")
	@serializable()
	public baseHeight: number = 12;

	@input("number", { step: 1 })
	@serializable()
	public seaLevel: number = 7;


	@section("World Scales")
	@input("number")
	@serializable()
	public continentalScale: number = 96;

	@input("number")
	@serializable()
	public continentalStrength: number = 12;

	@input("number")
	@serializable()
	public detailScale: number = 87 / 2.5;

	@input("number")
	@serializable()
	public detailStrength: number = 4;

	@input("number")
	@serializable()
	public roughnessScale: number = 87 / 2;

	@input("number")
	@serializable()
	public roughnessStrength: number = 1.2;


	@section("Biome Scales")
	@input("number", { step: 1 })
	@serializable()
	public biomeTemperatureScale: number = 192;

	@input("number", { step: 1 })
	@serializable()
	public biomeMoistureScale: number = 148;

	@input("number", { step: 1 })
	@serializable()
	public biomeElevationScale: number = 256;
}
