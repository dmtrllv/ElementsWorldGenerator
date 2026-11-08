
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

	public override generate(region: Region, scope: GenerationScopeType): void {
		const continentalOutput = this.continental.data;
		const oceanOutput = this.ocean.data;
		const coastOutput = this.coast.data;

		const continentalParams = this.params.continental;
		const oceanParams = this.params.oceanParams;
		const coastParams = this.params.coastParams;

		const width = region.width;
		const height = region.height;

		const outputWidth = scope === GenerationScope.Global ? this.worldSize.x : this.chunkSize.x;
		const outputHeight = scope === GenerationScope.Global ? this.worldSize.z : this.chunkSize.y;

		if (width !== outputWidth || height !== outputHeight)
			throw new RangeError(`Invalid ${scope} region dimensions.`);

		const transitionWidth = coastParams.transitionWidth.state;
		const halo = Math.ceil(Math.max(0, transitionWidth)) + 1;

		const expandedRegion = region.expand(halo);
		const expandedWidth = expandedRegion.width;
		const expandedHeight = expandedRegion.height;
		const expandedSize = expandedWidth * expandedHeight;

		const continental = new Float32Array(expandedSize);
		const ocean = new Float32Array(expandedSize);
		const coastSeeds = new Uint8Array(expandedSize);

		const landThreshold = 0.5;
		const warpStrength = continentalParams.warpStrength.state;
		const normalization = continentalParams.normalization;

		const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
		const normalize = (value: number, min: number, max: number) => clamp((value - min) / (max - min), 0, 1);

		// generate continental and ocean maps
		for (let z = 0; z < expandedHeight; z++) {
			for (let x = 0; x < expandedWidth; x++) {
				const index = z * expandedWidth + x;

				const worldX = expandedRegion.x + x;
				const worldZ = expandedRegion.z + z;

				const warp = continentalParams.warp.get(worldX, worldZ);

				const warpedX = worldX + warp.x * warpStrength;
				const warpedZ = worldZ + warp.y * warpStrength;

				const continentalValue = continentalParams.distribution.get(warpedX, warpedZ);
				const normalizedContinental = normalize(continentalValue, normalization.min, normalization.max);

				const landValue = continentalParams.shape.evaluate(normalizedContinental);
				continental[index] = landValue;

				if (landValue >= landThreshold) {
					ocean[index] = 0;
					continue;
				}

				const oceanValue = oceanParams.distribution.get(worldX, worldZ);
				const shelfValue = oceanParams.shelf.get(worldX, worldZ);

				const normalizedOcean = normalize(oceanValue, -1, 1);
				const normalizedShelf = normalize(shelfValue, -1, 1);

				ocean[index] = Math.max(0.001, normalizedOcean * normalizedShelf);
			}
		}

		// find land cells next to the ocean
		for (let z = 0; z < expandedHeight; z++) {
			for (let x = 0; x < expandedWidth; x++) {
				const index = z * expandedWidth + x;

				if (ocean[index]! > 0)
					continue;

				let adjacentToOcean = false;

				for (let dz = -1; dz <= 1 && !adjacentToOcean; dz++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dz === 0)
							continue;

						const nx = x + dx;
						const nz = z + dz;

						if (nx < 0 || nx >= expandedWidth || nz < 0 || nz >= expandedHeight)
							continue;

						if (ocean[nz * expandedWidth + nx]! > 0) {
							adjacentToOcean = true;
							break;
						}
					}
				}

				if (adjacentToOcean)
					coastSeeds[index] = 1;
			}
		}

		const distances = this.distanceTransform(coastSeeds, expandedWidth, expandedHeight);

		// copy the requested region into the output maps
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const sourceIndex = (z + halo) * expandedWidth + x + halo;
				const targetIndex = z * width + x;

				continentalOutput[targetIndex] = continental[sourceIndex]!;
				oceanOutput[targetIndex] = ocean[sourceIndex]!;

				if (ocean[sourceIndex]! > 0 || transitionWidth <= 0) {
					coastOutput[targetIndex] = 0;
					continue;
				}

				const distance = distances[sourceIndex]!;

				if (distance >= transitionWidth) {
					coastOutput[targetIndex] = 0;
					continue;
				}

				const normalizedDistance = 1 - distance / transitionWidth;
				coastOutput[targetIndex] = coastParams.falloff.evaluate(normalizedDistance);
			}
		}
	}
}
