import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import alea from "alea";
import type { BiomeId, BiomeRegistry } from "./biomes";

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
	private readonly biomes: BiomeRegistry;

	public constructor(seed: number, temperatureScale: number, moistureScale: number, elevationScale: number, biomes: BiomeRegistry) {
		const temperatureRandom = alea(`${seed}:temperature`);
		const moistureRandom = alea(`${seed}:moisture`);
		const elevationRandom = alea(`${seed}:biome-elevation`);

		this.temperatureScale = temperatureScale;
		this.moistureScale = moistureScale;
		this.elevationScale = elevationScale;
		this.biomes = biomes;

		this.temperatureNoise = createNoise2D(temperatureRandom);
		this.moistureNoise = createNoise2D(moistureRandom);
		this.elevationNoise = createNoise2D(elevationRandom);
	}

	public getBiome(x: number, z: number): BiomeId {
		const temperature = this.temperatureNoise(x / this.temperatureScale, z / this.temperatureScale);
		const moisture = this.moistureNoise(x / this.moistureScale + 100, z / this.moistureScale + 100);
		const elevation = this.elevationNoise(x / this.elevationScale + 200, z / this.elevationScale + 200);
		const iter = this.biomes.getAll().values();
		const fallback = iter.next();
		for (const biome of iter) {
			const constraints = biome.constraints;

			if (constraints.elevation) {
				if ("<" in constraints.elevation && elevation >= constraints.elevation["<"]!)
					continue;

				if (">" in constraints.elevation && elevation <= constraints.elevation[">"]!)
					continue;
			}

			if (constraints.moisture) {
				if ("<" in constraints.moisture && moisture >= constraints.moisture["<"]!)
					continue;

				if (">" in constraints.moisture && moisture <= constraints.moisture[">"]!)
					continue;
			}

			if (constraints.temperature) {
				if ("<" in constraints.temperature && temperature >= constraints.temperature["<"]!)
					continue;

				if (">" in constraints.temperature && temperature <= constraints.temperature[">"]!)
					continue;
			}

			return biome.id;
		}
		if (!fallback.value)
			throw new Error(`No biome matches constraints at (${x}, ${z}). Temperature: ${temperature}, moisture: ${moisture}, elevation: ${elevation}`);
		return fallback.value.id;
	}
}
