import { Vector3 } from "three";

export type GenerationSettings = {
	size: Vector3;
	baseHeight: number;
	seaLevel: number;
	continentalScale: number;
	continentalStrength: number;
	detailScale: number;
	detailStrength: number;
	roughnessScale: number;
	roughnessStrength: number;
};

const DEFAULT_WORLD_SIZE = 32;
const DEFAULT_WORLD_HEIGHT = 32;

export const DEFAULT_GENERATION_SETTINGS: Readonly<GenerationSettings> = {
	size: new Vector3(DEFAULT_WORLD_SIZE, DEFAULT_WORLD_HEIGHT, DEFAULT_WORLD_SIZE),
	baseHeight: 12,
	seaLevel: 7,
	continentalScale: 48,
	continentalStrength: 12,
	detailScale: 48 / 2.5,
	detailStrength: 4,
	roughnessScale: 48 / 2,
	roughnessStrength: 1.2
}