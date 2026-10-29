import { Vector3 } from "three";
import { randomInt } from "../utils";

export type SharedGenerationSettings = {
	baseHeight: number;
	continentalScale: number;
	continentalStrength: number;
	detailScale: number;
	detailStrength: number;
	roughnessScale: number;
	roughnessStrength: number;
};

export type GenerationSettings = SharedGenerationSettings & {
	seed: number;
	size: Vector3;
	seaLevel: number;
	biomeTemperatureScale: number;
	biomeMoistureScale: number;
	biomeElevationScale: number;
};

const DEFAULT_WORLD_SIZE = 32;
const DEFAULT_WORLD_HEIGHT = 32;

export const DEFAULT_GENERATION_SETTINGS: Readonly<GenerationSettings> = {
	seed: randomInt(0, 1_000_000_000),
	size: new Vector3(DEFAULT_WORLD_SIZE, DEFAULT_WORLD_HEIGHT, DEFAULT_WORLD_SIZE),
	baseHeight: 12,
	seaLevel: 7,
	continentalScale: 48,
	continentalStrength: 12,
	detailScale: 48 / 2.5,
	detailStrength: 4,
	roughnessScale: 48 / 2,
	roughnessStrength: 1.2,
	biomeTemperatureScale: 96,
	biomeMoistureScale: 72,
	biomeElevationScale: 128,
}