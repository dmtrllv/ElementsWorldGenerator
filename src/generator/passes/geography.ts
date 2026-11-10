import { benchmark, benchmarkBlock, clamp } from "../../utils";
import type { GenerationContext } from "../context";
import { CoastMap, ContinentalDistributionMap, ContinentalMap, OceanMap } from "../maps";
import type { SampleRegion } from "../maps/map";
import { GeographyParams } from "../param-groups";
import { Region } from "../region";
import { dependency, GenerationScope, output, Pass } from "./pass";

type GeographyTile = {
	samples: SampleRegion;
	continental: Float32Array;
	ocean: Float32Array;
	coast: Float32Array;
};

export class GeographyPass extends Pass {
	@dependency(GeographyParams)
	public params!: GeographyParams;

	@output(ContinentalMap)
	public continental!: ContinentalMap;

	@output(OceanMap)
	public ocean!: OceanMap;

	@output(CoastMap)
	public coast!: CoastMap;

	@dependency(ContinentalDistributionMap, GenerationScope.Global, worldParams => worldParams.chunkSize / 2)
	public distribution!: ContinentalDistributionMap;

	private readonly tileChunks = 8;
	private readonly tiles = new Map<string, GeographyTile>();


	private chamferDistance(seeds: Uint8Array, width: number, height: number): Float32Array {
		const distances = new Float32Array(width * height);
		const diagonal = Math.SQRT2;

		distances.fill(Infinity);

		for (let i = 0; i < seeds.length; i++) {
			if (seeds[i] === 1)
				distances[i] = 0;
		}

		// Forward pass.
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;
				let distance = distances[index]!;

				if (x > 0)
					distance = Math.min(distance, distances[index - 1]! + 1);

				if (z > 0) {
					distance = Math.min(distance, distances[index - width]! + 1);

					if (x > 0)
						distance = Math.min(distance, distances[index - width - 1]! + diagonal);

					if (x < width - 1)
						distance = Math.min(distance, distances[index - width + 1]! + diagonal);
				}

				distances[index] = distance;
			}
		}

		// Backward pass.
		for (let z = height - 1; z >= 0; z--) {
			for (let x = width - 1; x >= 0; x--) {
				const index = z * width + x;
				let distance = distances[index]!;

				if (x < width - 1)
					distance = Math.min(distance, distances[index + 1]! + 1);

				if (z < height - 1) {
					distance = Math.min(distance, distances[index + width]! + 1);

					if (x > 0)
						distance = Math.min(distance, distances[index + width - 1]! + diagonal);

					if (x < width - 1)
						distance = Math.min(distance, distances[index + width + 1]! + diagonal);
				}

				distances[index] = distance;
			}
		}

		return distances;
	}

	private readonly normalize = (value: number, min: number, max: number) => {
		if (max <= min)
			return value >= max ? 1 : 0;

		return clamp((value - min) / (max - min), 0, 1);
	};

	private normalizeContinental(value: number, threshold: number): number {
		if (value >= threshold) {
			return 0.5 + 0.5 * this.normalize(value, threshold, 1);
		}

		return 0.5 * this.normalize(value, 0, threshold);
	}

	private sampleBilinear(data: Float32Array, width: number, height: number, x: number, z: number): number {
		const x0 = clamp(Math.floor(x), 0, width - 1);
		const z0 = clamp(Math.floor(z), 0, height - 1);
		const x1 = Math.min(x0 + 1, width - 1);
		const z1 = Math.min(z0 + 1, height - 1);

		const tx = clamp(x - x0, 0, 1);
		const tz = clamp(z - z0, 0, 1);

		const topLeft = data[z0 * width + x0]!;
		const topRight = data[z0 * width + x1]!;
		const bottomLeft = data[z1 * width + x0]!;
		const bottomRight = data[z1 * width + x1]!;

		const top = topLeft * (1 - tx) + topRight * tx;
		const bottom = bottomLeft * (1 - tx) + bottomRight * tx;

		return top * (1 - tz) + bottom * tz;
	}

	private getTileRegion(region: Region, context: GenerationContext): { region: Region; key: string } {
		const tileSize = this.chunkSize * this.tileChunks;

		const tileX = Math.floor((region.x - context.worldRegion.x) / tileSize);
		const tileZ = Math.floor((region.z - context.worldRegion.z) / tileSize);

		return {
			region: new Region(
				context.worldRegion.x + tileX * tileSize,
				context.worldRegion.z + tileZ * tileSize,
				tileSize,
				tileSize
			),
			key: `${tileX}:${tileZ}:${context.resolution}`
		};
	}

	@benchmark
	private generateTile(region: Region, context: GenerationContext): GeographyTile {
		const oceanParams = this.params.oceanParams;
		const coastParams = this.params.coastParams;

		const transitionWidth = Math.max(coastParams.transitionWidth.state, 0);
		const shelfWidth = Math.max(oceanParams.shelfWidth.state, 1);

		const coarseResolution = this.distribution.samples.resolution;
		const expansion = Math.ceil(Math.max(transitionWidth, shelfWidth * 1.5) / coarseResolution) * coarseResolution + coarseResolution * 2;

		const workingRegion = region.expand(expansion);

		const samples = context.getSampleRegionFor(region);
		const coarseSamples = context.getSampleRegionFor(workingRegion, coarseResolution);

		const width = coarseSamples.width;
		const height = coarseSamples.height;
		const size = width * height;

		const continentalValues = new Float32Array(size);
		const oceanValues = new Float32Array(size);
		const coastValues = new Float32Array(size);

		const oceanMask = new Uint8Array(size);
		const coastlineSeeds = new Uint8Array(size);

		const distributionSamples = this.distribution.samples;
		const distributionWidth = distributionSamples.width;
		const distributionOffsetX = Math.round((coarseSamples.x - distributionSamples.x) / coarseResolution);
		const distributionOffsetZ = Math.round((coarseSamples.z - distributionSamples.z) / coarseResolution);

		const landThreshold = this.distribution.landThreshold;

		// Classify land and ocean using the cached low-resolution distribution map.
		benchmarkBlock("Generate coarse continental classification", () => {
			for (let z = 0; z < height; z++) {
				const sourceOffset = (distributionOffsetZ + z) * distributionWidth + distributionOffsetX;
				const targetOffset = z * width;

				for (let x = 0; x < width; x++) {
					const index = targetOffset + x;
					const value = this.distribution.data[sourceOffset + x]!;

					continentalValues[index] = this.normalizeContinental(value, landThreshold);

					if (value < landThreshold)
						oceanMask[index] = 1;
				}
			}
		});

		// Find coarse land and ocean cells adjacent to the coastline.
		benchmarkBlock("Find coarse coastline", () => {
			for (let z = 0; z < height; z++) {
				for (let x = 0; x < width; x++) {
					const index = z * width + x;
					const isOcean = oceanMask[index] === 1;

					let adjacentToOpposite = false;

					for (let dz = -1; dz <= 1 && !adjacentToOpposite; dz++) {
						for (let dx = -1; dx <= 1; dx++) {
							if (dx === 0 && dz === 0)
								continue;

							const nx = x + dx;
							const nz = z + dz;

							if (nx < 0 || nx >= width || nz < 0 || nz >= height)
								continue;

							const neighborIndex = nz * width + nx;
							const neighborIsOcean = oceanMask[neighborIndex] === 1;

							if (isOcean !== neighborIsOcean) {
								adjacentToOpposite = true;
								break;
							}
						}
					}

					if (adjacentToOpposite) {
						coastlineSeeds[index] = 1;
					}
				}
			}
		});

		// Calculate approximate coastline distances at coarse resolution.
		const coastlineDistances = this.chamferDistance(coastlineSeeds, width, height);

		// Generate ocean floor noise only at coarse resolution.
		benchmarkBlock("Generate coarse ocean floor", () => {
			for (let i = 0; i < size; i++) {
				if (oceanMask[i] === 0)
					continue;

				const x = i % width;
				const z = Math.floor(i / width);

				const worldX = coarseSamples.x + x * coarseResolution;
				const worldZ = coarseSamples.z + z * coarseResolution;

				const oceanValue = oceanParams.distribution.get(worldX, worldZ);
				const shelfValue = oceanParams.shelf.get(worldX, worldZ);

				const normalizedOcean = this.normalize(oceanValue, -1, 1);
				const normalizedShelf = this.normalize(shelfValue, -1, 1);

				const effectiveShelfWidth = Math.max(shelfWidth * (0.5 + normalizedShelf), coarseResolution);
				const oceanDistance = coastlineDistances[i]! * coarseResolution;
				const shelfProgress = clamp(oceanDistance / effectiveShelfWidth, 0, 1);
				const shelfFactor = shelfProgress * shelfProgress * (3 - 2 * shelfProgress);

				const basinDepth = 0.5 + normalizedOcean * 0.5;

				oceanValues[i] = clamp(shelfFactor * basinDepth, 0, 1);
			}
		});

		// Precompute the falloff curve.
		const lookupSize = 1024;
		const falloffLookup = new Float32Array(lookupSize);

		for (let i = 0; i < lookupSize; i++)
			falloffLookup[i] = clamp(coastParams.falloff.evaluate(i / (lookupSize - 1)), 0, 1);

		// Generate the approximate coast transition at coarse resolution.
		benchmarkBlock("Generate coarse coast", () => {
			for (let i = 0; i < size; i++) {
				if (oceanMask[i] === 1 || transitionWidth <= 0)
					continue;

				const distance = coastlineDistances[i]! * coarseResolution;

				if (distance >= transitionWidth)
					continue;

				const normalizedDistance = distance / transitionWidth;
				const lookupIndex = normalizedDistance * (lookupSize - 1);

				const lower = Math.floor(lookupIndex);
				const upper = Math.min(lower + 1, lookupSize - 1);
				const t = lookupIndex - lower;

				coastValues[i] = falloffLookup[lower]! * (1 - t) + falloffLookup[upper]! * t;
			}
		});

		const tileWidth = samples.width;
		const tileHeight = samples.height;

		const tileContinental = new Float32Array(tileWidth * tileHeight);
		const tileOcean = new Float32Array(tileWidth * tileHeight);
		const tileCoast = new Float32Array(tileWidth * tileHeight);

		// Interpolate the coarse maps into the full-resolution tile.
		benchmarkBlock("Interpolate geography tile", () => {
			for (let z = 0; z < tileHeight; z++) {
				const worldZ = samples.z + z * samples.resolution;
				const coarseZ = (worldZ - coarseSamples.z) / coarseResolution;

				for (let x = 0; x < tileWidth; x++) {
					const worldX = samples.x + x * samples.resolution;
					const coarseX = (worldX - coarseSamples.x) / coarseResolution;
					const index = z * tileWidth + x;

					tileContinental[index] = this.sampleBilinear(continentalValues, width, height, coarseX, coarseZ);
					tileOcean[index] = this.sampleBilinear(oceanValues, width, height, coarseX, coarseZ);
					tileCoast[index] = this.sampleBilinear(coastValues, width, height, coarseX, coarseZ);
				}
			}
		});

		return {
			samples,
			continental: tileContinental,
			ocean: tileOcean,
			coast: tileCoast
		};
	}

	private getTile(region: Region, context: GenerationContext): GeographyTile {
		const { region: tileRegion, key } = this.getTileRegion(region, context);

		let tile = this.tiles.get(key);

		if (!tile) {
			tile = this.generateTile(tileRegion, context);
			this.tiles.set(key, tile);
		}

		return tile;
	}

	@benchmark
	public override generate(region: Region, context: GenerationContext): void {
		const tile = this.getTile(region, context);
		const outputSamples = context.getSampleRegion();

		const outputWidth = outputSamples.width;
		const tileWidth = tile.samples.width;

		const offsetX = Math.round((outputSamples.x - tile.samples.x) / outputSamples.resolution);
		const offsetZ = Math.round((outputSamples.z - tile.samples.z) / outputSamples.resolution);

		const continentalOutput = this.continental.data;
		const oceanOutput = this.ocean.data;
		const coastOutput = this.coast.data;

		for (let z = 0; z < outputSamples.height; z++) {
			const sourceOffset = (offsetZ + z) * tileWidth + offsetX;
			const targetOffset = z * outputWidth;

			continentalOutput.set(tile.continental.subarray(sourceOffset, sourceOffset + outputWidth), targetOffset);
			oceanOutput.set(tile.ocean.subarray(sourceOffset, sourceOffset + outputWidth), targetOffset);
			coastOutput.set(tile.coast.subarray(sourceOffset, sourceOffset + outputWidth), targetOffset);
		}
	}
}
