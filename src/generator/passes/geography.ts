import { clamp } from "../../utils";
import type { GenerationContext } from "../context";
import { CoastMap, ContinentalDistributionMap, ContinentalMap, OceanMap, type SampleRegion } from "../maps";
import { GeographyParams } from "../param-groups";
import type { Region } from "../region";
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

	@dependency(ContinentalDistributionMap, GenerationScope.Global, worldParams => worldParams.chunkSize / 2)
	public distribution!: ContinentalDistributionMap;

	private distanceTransform1D(input: Float64Array, output: Float64Array, length: number, v: Int32Array, z: Float64Array): void {
		let first = -1;

		for (let i = 0; i < length; i++) {
			if (Number.isFinite(input[i]!)) {
				first = i;
				break;
			}
		}

		if (first === -1) {
			output.fill(Infinity, 0, length);
			return;
		}

		let k = 0;

		v[0] = first;
		z[0] = -Infinity;
		z[1] = Infinity;

		for (let q = first + 1; q < length; q++) {
			if (!Number.isFinite(input[q]!))
				continue;

			let s = 0;

			while (k >= 0) {
				const p = v[k]!;
				s = ((input[q]! + q * q) - (input[p]! + p * p)) / (2 * q - 2 * p);

				if (s > z[k]!)
					break;

				k--;
			}

			if (k < 0) {
				k = 0;
				v[0] = q;
				z[0] = -Infinity;
				z[1] = Infinity;
				continue;
			}

			k++;
			v[k] = q;
			z[k] = s;
			z[k + 1] = Infinity;
		}

		let envelope = 0;

		for (let q = 0; q < length; q++) {
			while (z[envelope + 1]! < q)
				envelope++;

			const p = v[envelope]!;
			const delta = q - p;

			output[q] = delta * delta + input[p]!;
		}
	}

	private distanceTransform(seeds: Uint8Array, width: number, height: number): Float64Array {
		const size = width * height;

		const distances = new Float64Array(size);
		const temporary = new Float64Array(size);

		const length = Math.max(width, height);

		const input = new Float64Array(length);
		const output = new Float64Array(length);

		const v = new Int32Array(length);
		const z = new Float64Array(length + 1);

		for (let y = 0; y < height; y++) {
			const offset = y * width;

			for (let x = 0; x < width; x++)
				input[x] = seeds[offset + x] === 1 ? 0 : Infinity;

			this.distanceTransform1D(input, output, width, v, z);

			for (let x = 0; x < width; x++)
				temporary[offset + x] = output[x]!;
		}

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++)
				input[y] = temporary[y * width + x]!;

			this.distanceTransform1D(input, output, height, v, z);

			for (let y = 0; y < height; y++)
				distances[y * width + x] = Math.sqrt(output[y]!);
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

	public override generate(region: Region, context: GenerationContext): void {
		const continentalOutput = this.continental.data;
		const oceanOutput = this.ocean.data;
		const coastOutput = this.coast.data;

		const continentalParams = this.params.continental;
		const oceanParams = this.params.oceanParams;
		const coastParams = this.params.coastParams;

		const samples = context.getSampleRegion();
		const width = samples.width;
		const height = samples.height;
		const size = width * height;

		if (region.width !== this.worldSize.x || region.height !== this.worldSize.z)
			throw new RangeError("GeographyPass requires a global region.");

		const transitionWidth = Math.max(coastParams.transitionWidth.state, 0);
		const shelfWidth = Math.max(oceanParams.shelfWidth.state, 1);
		const warpStrength = continentalParams.warpStrength.state;
		const normalization = continentalParams.normalization;

		const oceanMask = new Uint8Array(size);
		const coastSeeds = new Uint8Array(size);
		const oceanCoastSeeds = new Uint8Array(size);

		const landThreshold = this.distribution.landThreshold;

		// Generate continental and ocean classification.
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;

				const worldX = samples.x + x * samples.resolution;
				const worldZ = samples.z + z * samples.resolution;

				const warp = continentalParams.warp.get(worldX, worldZ);

				const warpedX = worldX + warp.x * warpStrength;
				const warpedZ = worldZ + warp.y * warpStrength;

				const continentalValue = continentalParams.distribution.get(warpedX, warpedZ);
				const normalizedContinental = this.normalize(continentalValue, normalization.min, normalization.max);

				const landValue = clamp(continentalParams.shape.evaluate(normalizedContinental), 0, 1);
				const normalizedLandValue = this.normalizeContinental(landValue, landThreshold);

				continentalOutput[index] = normalizedLandValue;

				if (landValue >= landThreshold) {
					oceanOutput[index] = 0;
					oceanMask[index] = 0;
					continue;
				}

				oceanOutput[index] = 1;
				oceanMask[index] = 1;
			}
		}

		// Find land and ocean cells adjacent to the coastline.
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
					if (isOcean)
						oceanCoastSeeds[index] = 1;
					else
						coastSeeds[index] = 1;
				}
			}
		}

		// Calculate distance to the nearest coastline on both sides.
		const distances = this.distanceTransform(coastSeeds, width, height);
		const oceanDistances = this.distanceTransform(oceanCoastSeeds, width, height);

		// Generate ocean floor depth.
		for (let i = 0; i < size; i++) {
			if (oceanMask[i] === 0)
				continue;

			const x = i % width;
			const z = Math.floor(i / width);

			const worldX = samples.x + x * samples.resolution;
			const worldZ = samples.z + z * samples.resolution;

			const oceanValue = oceanParams.distribution.get(worldX, worldZ);
			const shelfValue = oceanParams.shelf.get(worldX, worldZ);

			const normalizedOcean = this.normalize(oceanValue, -1, 1);
			const normalizedShelf = this.normalize(shelfValue, -1, 1);

			const effectiveShelfWidth = Math.max(shelfWidth * (0.5 + normalizedShelf), 1);
			const oceanDistance = oceanDistances[i]! * samples.resolution;
			const shelfProgress = clamp(oceanDistance / effectiveShelfWidth, 0, 1);
			const shelfFactor = shelfProgress * shelfProgress * (3 - 2 * shelfProgress);

			const basinDepth = 0.5 + normalizedOcean * 0.5;

			oceanOutput[i] = clamp(shelfFactor * basinDepth, 0, 1);
		}

		// Precompute the falloff curve.
		const lookupSize = 1024;
		const falloffLookup = new Float32Array(lookupSize);

		for (let i = 0; i < lookupSize; i++)
			falloffLookup[i] = clamp(coastParams.falloff.evaluate(i / (lookupSize - 1)), 0, 1);

		// Generate coast map.
		for (let i = 0; i < size; i++) {
			if (oceanMask[i] === 1 || transitionWidth <= 0) {
				coastOutput[i] = 0;
				continue;
			}

			const distance = distances[i]! * samples.resolution;

			if (distance >= transitionWidth) {
				coastOutput[i] = 0;
				continue;
			}

			const normalizedDistance = distance / transitionWidth;
			const lookupIndex = normalizedDistance * (lookupSize - 1);

			const lower = Math.floor(lookupIndex);
			const upper = Math.min(lower + 1, lookupSize - 1);
			const t = lookupIndex - lower;

			coastOutput[i] = falloffLookup[lower]! * (1 - t) + falloffLookup[upper]! * t;
		}
	}
}
