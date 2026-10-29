import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import alea from "alea";
import type { BiomeId } from "./biomes";
import { GRASSLAND, FOREST, DESERT, MOUNTAINS } from "./biomes";

export interface BiomeSource {
	getBiome(x: number, z: number): BiomeId;
}

export class ProceduralBiomeSource implements BiomeSource {
	private readonly temperatureNoise: NoiseFunction2D;
	private readonly moistureNoise: NoiseFunction2D;
	private readonly elevationNoise: NoiseFunction2D;
	private readonly temperatureScale: number;
	private readonly moistureScale: number;
	private readonly elevationScale: number;

	public constructor(seed: number, temperatureScale = 96, moistureScale = 72, elevationScale = 128) {
		const temperatureRandom = alea(`${seed}:temperature`);
		const moistureRandom = alea(`${seed}:moisture`);
		const elevationRandom = alea(`${seed}:biome-elevation`);

		this.temperatureScale = temperatureScale;
		this.moistureScale = moistureScale;
		this.elevationScale = elevationScale;

		this.temperatureNoise = createNoise2D(temperatureRandom);
		this.moistureNoise = createNoise2D(moistureRandom);
		this.elevationNoise = createNoise2D(elevationRandom);
	}

	public getBiome(x: number, z: number): BiomeId {
		const temperature = this.temperatureNoise(x / this.temperatureScale, z / this.temperatureScale);
		const moisture = this.moistureNoise(x / this.moistureScale + 100, z / this.moistureScale + 100);
		const elevation = this.elevationNoise(x / this.elevationScale + 200, z / this.elevationScale + 200);

		if (elevation > 0.55)
			return MOUNTAINS;

		if (temperature > 0.25 && moisture < -0.15)
			return DESERT;

		if (moisture > 0.1)
			return FOREST;

		return GRASSLAND;
	}
}
