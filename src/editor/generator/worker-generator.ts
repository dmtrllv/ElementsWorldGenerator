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

	public generateChunk(request: ChunkGenerationRequest): ChunkGenerationResult {
		const world = this.worldSettings;
		const noise2D = this.noise2D;
		const biomeSource = this.biomeSource;

		if (!world || !noise2D || !biomeSource)
			throw new Error("WorkerGenerator has not been synchronized.");

		const { size, chunkSize, seaLevel, baseHeight, continentalScale, continentalStrength, detailScale, detailStrength, roughnessScale, roughnessStrength } = world;

		const originX = request.chunkX * chunkSize;
		const originZ = request.chunkZ * chunkSize;
		const endX = Math.min(originX + chunkSize, size.x);
		const endZ = Math.min(originZ + chunkSize, size.z);

		if (originX < 0 || originZ < 0 || originX >= size.x || originZ >= size.z)
			throw new RangeError(`Chunk coordinates (${request.chunkX}, ${request.chunkZ}) are outside the world.`);

		const width = endX - originX;
		const depth = endZ - originZ;

		const minX = Math.max(0, originX - this.maxTransitionWidth);
		const minZ = Math.max(0, originZ - this.maxTransitionWidth);
		const maxX = Math.min(size.x, endX + this.maxTransitionWidth);
		const maxZ = Math.min(size.z, endZ + this.maxTransitionWidth);

		const biomeGrid = new Uint32Array((maxX - minX) * (maxZ - minZ));

		for (let x = minX; x < maxX; x++) {
			for (let z = minZ; z < maxZ; z++) {
				biomeGrid[(z - minZ) * (maxX - minX) + x - minX] = biomeSource.getBiome(x - size.x / 2, z - size.z / 2);
			}
		}

		const biomeById = new Map(this.biomes.filter(Boolean).map(biome => [biome.id, biome]));
		const heights = new Uint16Array(width * depth);
		const biomeIds = new Uint32Array(width * depth);
		const blocks: number[] = [];

		for (let x = originX; x < endX; x++) {
			for (let z = originZ; z < endZ; z++) {
				const index = (z - originZ) * width + x - originX;
				const biomeId = biomeGrid[(z - minZ) * (maxX - minX) + x - minX];
				const biome = biomeById.get(biomeId);

				if (!biome)
					throw new Error(`Unknown biome ID ${biomeId}.`);

				biomeIds[index] = biomeId;

				const biomeWeights = new Map<number, number>();

				for (let dx = -this.maxTransitionWidth; dx <= this.maxTransitionWidth; dx++) {
					for (let dz = -this.maxTransitionWidth; dz <= this.maxTransitionWidth; dz++) {
						const sampleX = x + dx;
						const sampleZ = z + dz;

						if (sampleX < minX || sampleX >= maxX || sampleZ < minZ || sampleZ >= maxZ)
							continue;

						const neighborId = biomeGrid[(sampleZ - minZ) * (maxX - minX) + sampleX - minX];
						const neighbor = biomeById.get(neighborId);

						if (!neighbor)
							throw new Error(`Unknown biome ID ${neighborId}.`);

						const distance = Math.sqrt(dx * dx + dz * dz);

						if (distance > neighbor.transitionWidth && distance !== 0)
							continue;

						const weight = distance === 0 ? 1 : Math.pow(1 - distance / neighbor.transitionWidth, neighbor.transitionSharpness);

						if (weight <= 0)
							continue;

						biomeWeights.set(neighborId, (biomeWeights.get(neighborId) ?? 0) + weight);
					}
				}

				let blendedHeight = 0;
				let totalWeight = 0;
				const worldX = x - size.x / 2;
				const worldZ = z - size.z / 2;

				for (const [weightedBiomeId, weight] of biomeWeights) {
					const weightedBiome = biomeById.get(weightedBiomeId);

					if (!weightedBiome)
						throw new Error(`Unknown biome ID ${weightedBiomeId}.`);

					const biomeBaseHeight = (baseHeight + weightedBiome.baseHeight) / 2;

					const biomeContinentalScale = (continentalScale + weightedBiome.continentalScale) / 2;
					const biomeDetailScale = (detailScale + weightedBiome.detailScale) / 2;
					const biomeRoughnessScale = (roughnessScale + weightedBiome.roughnessScale) / 2;

					const biomeContinentalStrength = (continentalStrength + weightedBiome.continentalStrength) / 2;
					const biomeDetailStrength = (detailStrength + weightedBiome.detailStrength) / 2;
					const biomeRoughnessStrength = (roughnessStrength + weightedBiome.roughnessStrength) / 2;

					const large = noise2D(worldX / biomeContinentalScale, worldZ / biomeContinentalScale);
					const medium = noise2D(worldX / biomeDetailScale + 100, worldZ / biomeDetailScale + 100);
					const fine = noise2D(worldX / biomeRoughnessScale + 200, worldZ / biomeRoughnessScale + 200);

					const height = biomeBaseHeight + large * biomeContinentalStrength + medium * biomeDetailStrength + fine * biomeRoughnessStrength;

					blendedHeight += height * weight;
					totalWeight += weight;
				}

				const height = blendedHeight / totalWeight;
				const clampedHeight = Math.max(1, Math.min(size.y, Math.round(height)));

				heights[index] = clampedHeight;

				for (let y = 0; y < clampedHeight; y++) {
					const blockDepth = clampedHeight - 1 - y;
					const materialId = blockDepth === 0 ? 1 : blockDepth <= 3 ? 2 : 4;

					blocks.push(x - originX, y, z - originZ, materialId);
				}
			}
		}

		return {
			chunkX: request.chunkX,
			chunkZ: request.chunkZ,
			width,
			depth,
			heights,
			biomeIds,
			blocks: new Uint32Array(blocks),
		};
	}
}