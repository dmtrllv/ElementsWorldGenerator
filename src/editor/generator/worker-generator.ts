import alea from "alea";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import type { WorldSettings } from "./world-settings";
import type { Biome } from "./biomes";
import { ProceduralBiomeSource } from "./biome-source";

export type WorkerGeneratorSettings = {
	world: WorldSettings;
	biomes: Biome[];
};

export type ChunkGenerationRequest = {
	chunkX: number;
	chunkZ: number;
};

export type ChunkGenerationResult = {
	chunkX: number;
	chunkZ: number;
	width: number;
	depth: number;
	heights: Uint16Array;
	biomeIds: Uint32Array;
	blocks: Uint32Array;
};

export class WorkerGenerator {
	private worldSettings: WorldSettings | null = null;
	private biomes: Biome[] = [];
	private noise2D: NoiseFunction2D | null = null;
	private biomeSource: ProceduralBiomeSource | null = null;
	private maxTransitionWidth = 0;

	public sync(world: WorldSettings, biomes: Biome[]): void {
		this.worldSettings = world;
		this.biomes = biomes;
		this.noise2D = createNoise2D(alea(world.seed));
		this.biomeSource = new ProceduralBiomeSource(world.seed, world.biomeTemperatureScale, world.biomeMoistureScale, world.biomeElevationScale, biomes);
		this.maxTransitionWidth = Math.ceil(Math.max(0, ...biomes.map(biome => biome.transitionWidth)));
	}

	public generateBiomeGrid(chunkX: number, chunkZ: number): { originX: number; originZ: number; width: number; depth: number; biomeIds: Uint32Array } {
		if (!this.worldSettings || !this.biomeSource)
			throw new Error("WorkerGenerator has not been synchronized.");

		const { size, chunkSize } = this.worldSettings;
		const startX = chunkX * chunkSize;
		const startZ = chunkZ * chunkSize;
		const endX = Math.min(startX + chunkSize, size.x);
		const endZ = Math.min(startZ + chunkSize, size.z);
		const border = this.maxTransitionWidth;
		const originX = startX - border;
		const originZ = startZ - border;
		const width = endX - startX + border * 2;
		const depth = endZ - startZ + border * 2;
		const biomeIds = new Uint32Array(width * depth);

		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				biomeIds[z * width + x] = this.biomeSource.getBiome(originX + x, originZ + z);
			}
		}

		return { originX, originZ, width, depth, biomeIds };
	}
}