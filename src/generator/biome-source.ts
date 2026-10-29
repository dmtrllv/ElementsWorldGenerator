import { createNoise2D } from "simplex-noise";
import alea from "alea";
import type { BiomeId } from "./biomes";
import { GRASSLAND, FOREST, DESERT, MOUNTAINS } from "./biomes";

export interface BiomeSource {
	getBiome(x: number, z: number): BiomeId;
}

export class ProceduralBiomeSource implements BiomeSource {
	private readonly temperatureNoise: ReturnType<typeof createNoise2D>;
	private readonly moistureNoise: ReturnType<typeof createNoise2D>;
	private readonly elevationNoise: ReturnType<typeof createNoise2D>;

	public constructor(seed: number) {
		const temperatureRandom = alea(`${seed}:temperature`);
		const moistureRandom = alea(`${seed}:moisture`);
		const elevationRandom = alea(`${seed}:biome-elevation`);

		this.temperatureNoise = createNoise2D(temperatureRandom);
		this.moistureNoise = createNoise2D(moistureRandom);
		this.elevationNoise = createNoise2D(elevationRandom);
	}

	public getBiome(x: number, z: number): BiomeId {
		const temperature = this.temperatureNoise(x / 96, z / 96);
		const moisture = this.moistureNoise(x / 72 + 100, z / 72 + 100);
		const elevation = this.elevationNoise(x / 128 + 200, z / 128 + 200);

		if (elevation > 0.55)
			return MOUNTAINS;

		if (temperature > 0.25 && moisture < -0.15)
			return DESERT;

		if (moisture > 0.1)
			return FOREST;

		return GRASSLAND;
	}
}
