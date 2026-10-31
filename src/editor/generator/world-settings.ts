import { Vector3 } from "three";
import { store } from "../../state";
import { randomSeed } from "../../utils";
import { serializable } from "../serializer";
import { Settings, section, input, Vector3Serializer } from "../settings";
import { Scalar } from "../scalar";

@store
export class WorldSettings extends Settings {
	@section("World Settings")
	@input("number")
	@serializable()
	public seed: number = randomSeed();

	@input("vec3")
	@serializable(Vector3, Vector3Serializer)
	public size: Vector3 = new Vector3(512, 64, 512);

	@input("number")
	@serializable()
	public chunkSize: number = 16;

	@input("number")
	@serializable()
	public baseHeight: number = 12;

	@input("number")
	@serializable()
	public seaLevel: number = 7;

	@section("Latitude")
	@input("number")
	@input("dropdown", ["x", "z"])
	@serializable()
	public axis: LatitudeAxis = "x";

	@input("number")
	@serializable()
	public stepDistance: number = 0;

	@input("number")
	@serializable()
	public offset: number = 0;

	@input("scalar")
	@serializable(Scalar)
	public distortion: Scalar = new Scalar(0);

	@input("scalar")
	@serializable(Scalar)
	public distortion2: Scalar = new Scalar(0);

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
	@input("number")
	@serializable()
	public biomeTemperatureScale: number = 192;

	@input("number")
	@serializable()
	public biomeMoistureScale: number = 148;

	@input("number")
	@serializable()
	public biomeElevationScale: number = 256;
}

export type LatitudeAxis = "x" | "z";
