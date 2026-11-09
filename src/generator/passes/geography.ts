
import { CoastMap, ContinentalMap, OceanMap } from "../maps";
import { GeographyParams } from "../param-groups";
import type { Region } from "../region";
import { dependency, GenerationScope, output, Pass, type GenerationScope as GenerationScopeType } from "./pass";

export class GeographyPass extends Pass {
	@dependency(GeographyParams)
	public params!: GeographyParams;

	@output(ContinentalMap)
	public continental!: ContinentalMap;

	@output(OceanMap)
	public ocean!: OceanMap;

	@output(CoastMap)
	public coast!: CoastMap;

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

			do {
				const p = v[k]!;
				s = ((input[q]! + q * q) - (input[p]! + p * p)) / (2 * q - 2 * p);

				if (s <= z[k]!)
					k--;
				else
					break;
			} while (k >= 0);

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


	public override generate(region: Region, _scope: GenerationScopeType): void {
		const continentalOutput = this.continental.data;
		const oceanOutput = this.ocean.data;
		const coastOutput = this.coast.data;

		const continentalParams = this.params.continental;
		const oceanParams = this.params.oceanParams;
		const coastParams = this.params.coastParams;

		const width = region.width;
		const height = region.height;
		const size = width * height;

		const outputWidth = this.worldSize.x;
		const outputHeight = this.worldSize.z;

		if (width !== outputWidth || height !== outputHeight)
			throw new RangeError("GeographyPass requires a global region.");

		const transitionWidth = coastParams.transitionWidth.state;
		const warpStrength = continentalParams.warpStrength.state;
		const normalization = continentalParams.normalization;

		const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
		const normalize = (value: number, min: number, max: number) => clamp((value - min) / (max - min), 0, 1);

		// Generate continental and ocean maps.
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;

				const worldX = region.x + x;
				const worldZ = region.z + z;

				const warp = continentalParams.warp.get(worldX, worldZ);

				const warpedX = worldX + warp.x * warpStrength;
				const warpedZ = worldZ + warp.y * warpStrength;

				const continentalValue = continentalParams.distribution.get(warpedX, warpedZ);
				const normalizedContinental = normalize(continentalValue, normalization.min, normalization.max);

				const landValue = continentalParams.shape.evaluate(normalizedContinental);
				continentalOutput[index] = landValue;

				if (landValue >= 0.5) {
					oceanOutput[index] = 0;
					continue;
				}

				const oceanValue = oceanParams.distribution.get(worldX, worldZ);
				const shelfValue = oceanParams.shelf.get(worldX, worldZ);

				const normalizedOcean = normalize(oceanValue, -1, 1);
				const normalizedShelf = normalize(shelfValue, -1, 1);

				oceanOutput[index] = Math.max(0.001, normalizedOcean * normalizedShelf);
			}
		}

		// Find land cells adjacent to the ocean.
		const coastSeeds = new Uint8Array(size);

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;

				if (oceanOutput[index]! > 0)
					continue;

				let adjacentToOcean = false;

				for (let dz = -1; dz <= 1 && !adjacentToOcean; dz++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dz === 0)
							continue;

						const nx = x + dx;
						const nz = z + dz;

						if (nx < 0 || nx >= width || nz < 0 || nz >= height)
							continue;

						if (oceanOutput[nz * width + nx]! > 0) {
							adjacentToOcean = true;
							break;
						}
					}
				}

				if (adjacentToOcean)
					coastSeeds[index] = 1;
			}
		}

		// Calculate distance to the nearest coastline.
		const distances = this.distanceTransform(coastSeeds, width, height);

		// Precompute the falloff curve.
		const lookupSize = 1024;
		const falloffLookup = new Float32Array(lookupSize);

		for (let i = 0; i < lookupSize; i++)
			falloffLookup[i] = coastParams.falloff.evaluate(i / (lookupSize - 1));

		// Generate coast map.
		for (let i = 0; i < size; i++) {
			if (oceanOutput[i]! > 0 || transitionWidth <= 0) {
				coastOutput[i] = 0;
				continue;
			}

			const distance = distances[i]!;

			if (distance >= transitionWidth) {
				coastOutput[i] = 0;
				continue;
			}

			const normalizedDistance = 1 - distance / transitionWidth;
			const lookupIndex = normalizedDistance * (lookupSize - 1);

			const lower = Math.floor(lookupIndex);
			const upper = Math.min(lower + 1, lookupSize - 1);
			const t = lookupIndex - lower;

			coastOutput[i] = falloffLookup[lower]! * (1 - t) + falloffLookup[upper]! * t;
		}
	}

}
