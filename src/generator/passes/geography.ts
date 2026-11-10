import { benchmark, clamp } from "../../utils";
import type { GenerationContext } from "../context";
import { CoastMap, ContinentalMap, ContinentalThresholdMap, OceanMap } from "../maps";
import { GeographyParams } from "../param-groups";
import type { Region } from "../region";
import { sampleContinentalDistribution } from "./continental-distribution";
import { dependency, GenerationScope, output, Pass } from "./pass";

export class GeographyPass extends Pass {
	@dependency(GeographyParams)
	public params!: GeographyParams;

	@output(ContinentalMap)
	public continental!: ContinentalMap;

	@output(OceanMap)
	public ocean!: OceanMap;

	@output(CoastMap)
	public coast!: CoastMap;

	@dependency(ContinentalThresholdMap, GenerationScope.Global, worldParams => worldParams.chunkSize / 2)
	public threshold!: ContinentalThresholdMap;


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
		if (value >= threshold)
			return 0.5 + 0.5 * this.normalize(value, threshold, 1);

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

	@benchmark
	private generateChunk(region: Region, context: GenerationContext): void {
		const oceanParams = this.params.oceanParams;
		const coastParams = this.params.coastParams;

		const transitionWidth = Math.max(coastParams.transitionWidth.state, 0);
		const shelfWidth = Math.max(oceanParams.shelfWidth.state, 1);

		const coarseResolution = this.chunkSize / 2;
		const maxDistance = Math.max(transitionWidth, shelfWidth * 1.5);

		// Include enough neighbouring samples for coastline and shelf distances.
		const expansion = Math.ceil(maxDistance / coarseResolution) * coarseResolution + coarseResolution * 2;

		const workingRegion = region.expand(expansion);
		const outputSamples = context.getSampleRegion();
		const coarseSamples = context.getSampleRegionFor(workingRegion, coarseResolution);

		const width = coarseSamples.width;
		const height = coarseSamples.height;
		const size = width * height;

		const continentalValues = new Float32Array(size);
		const oceanValues = new Float32Array(size);
		const coastValues = new Float32Array(size);

		const oceanMask = new Uint8Array(size);
		const coastlineSeeds = new Uint8Array(size);

		const landThreshold = this.threshold.landThreshold;
		const continentalParams = this.params.continental;

		// Sample and classify the local coarse region.
		for (let z = 0; z < height; z++) {
			const worldZ = coarseSamples.z + z * coarseResolution;
			const rowOffset = z * width;

			for (let x = 0; x < width; x++) {
				const worldX = coarseSamples.x + x * coarseResolution;
				const index = rowOffset + x;

				const value = sampleContinentalDistribution(continentalParams, worldX, worldZ);

				continentalValues[index] = this.normalizeContinental(value, landThreshold);

				if (value < landThreshold)
					oceanMask[index] = 1;
			}
		}

		// Find coarse land and ocean cells adjacent to the coastline.
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

				if (adjacentToOpposite)
					coastlineSeeds[index] = 1;
			}
		}

		// Calculate approximate coastline distances at coarse resolution.
		const coastlineDistances = this.chamferDistance(coastlineSeeds, width, height);

		// Generate ocean floor noise only for local ocean samples.
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

		// Precompute the falloff curve.
		const lookupSize = 1024;
		const falloffLookup = new Float32Array(lookupSize);

		for (let i = 0; i < lookupSize; i++)
			falloffLookup[i] = clamp(coastParams.falloff.evaluate(i / (lookupSize - 1)), 0, 1);

		// Generate the approximate coast transition at coarse resolution.
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

		// Interpolate directly into the requested chunk's output maps.
		const continentalOutput = this.continental.data;
		const oceanOutput = this.ocean.data;
		const coastOutput = this.coast.data;

		for (let z = 0; z < outputSamples.height; z++) {
			const worldZ = outputSamples.z + z * outputSamples.resolution;
			const coarseZ = (worldZ - coarseSamples.z) / coarseResolution;

			for (let x = 0; x < outputSamples.width; x++) {
				const worldX = outputSamples.x + x * outputSamples.resolution;
				const coarseX = (worldX - coarseSamples.x) / coarseResolution;
				const index = z * outputSamples.width + x;

				continentalOutput[index] = this.sampleBilinear(continentalValues, width, height, coarseX, coarseZ);
				oceanOutput[index] = this.sampleBilinear(oceanValues, width, height, coarseX, coarseZ);
				coastOutput[index] = this.sampleBilinear(coastValues, width, height, coarseX, coarseZ);
			}
		}
	}

	@benchmark
	public override generate(region: Region, context: GenerationContext): void {
		this.generateChunk(region, context);
	}
}
