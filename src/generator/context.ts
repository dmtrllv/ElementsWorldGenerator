import type { Region } from "./region";
import type { GenerationScope } from "./passes/pass";
import type { SampleRegion } from "./maps/map";

export class GenerationContext {
	public readonly region: Region;
	public readonly scope: GenerationScope;
	public readonly resolution: number;

	public readonly worldRegion: Region;
	private readonly localRegion: Region | null;

	public constructor(region: Region, worldRegion: Region, scope: GenerationScope, resolution: number = 1) {
		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		this.region = region;
		this.scope = scope;
		this.resolution = resolution;
		this.worldRegion = worldRegion;
		this.localRegion = scope === "Local" ? region : null;
	}


	public getSampleRegion(scope: GenerationScope = this.scope, resolution: number = this.resolution): SampleRegion {
		return this.createSampleRegion(this.getRegion(scope), resolution);
	}

	public getSampleRegionFor(region: Region, resolution: number = this.resolution): SampleRegion {
		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		const clippedRegion = region.intersection(this.worldRegion);

		if (!clippedRegion) {
			return {
				x: 0,
				z: 0,
				width: 0,
				height: 0,
				resolution
			};
		}

		return this.createSampleRegion(clippedRegion, resolution);
	}

	private createSampleRegion(region: Region, resolution: number): SampleRegion {
		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		const minX = Math.ceil(region.x / resolution);
		const minZ = Math.ceil(region.z / resolution);
		const maxX = Math.ceil(region.maxX / resolution);
		const maxZ = Math.ceil(region.maxZ / resolution);

		return {
			x: minX * resolution,
			z: minZ * resolution,
			width: maxX - minX,
			height: maxZ - minZ,
			resolution
		};
	}


	public getIndex(x: number, z: number, scope: GenerationScope = this.scope, resolution: number = this.resolution): number {
		const samples = this.getSampleRegion(scope, resolution);

		const sampleX = Math.round(x / resolution);
		const sampleZ = Math.round(z / resolution);

		if (Math.abs(sampleX * resolution - x) > 1e-6 || Math.abs(sampleZ * resolution - z) > 1e-6)
			throw new RangeError(`Position (${x}, ${z}) is not aligned to resolution ${resolution}.`);

		const indexX = sampleX - Math.round(samples.x / resolution);
		const indexZ = sampleZ - Math.round(samples.z / resolution);

		if (indexX < 0 || indexX >= samples.width || indexZ < 0 || indexZ >= samples.height)
			throw new RangeError(`Position (${x}, ${z}) is outside the ${scope} map region.`);

		return indexZ * samples.width + indexX;
	}

	private getRegion(scope: GenerationScope): Region {
		const region = scope === "Global" ? this.worldRegion : this.localRegion;

		if (!region)
			throw new Error("Local map indexing requires a local generation context.");

		return region;
	}

	public getMapIndex(x: number, z: number, map: { readonly samples: SampleRegion }): number {
		const samples = map.samples;
		const resolution = samples.resolution;

		const sampleX = Math.round(x / resolution);
		const sampleZ = Math.round(z / resolution);

		if (Math.abs(sampleX * resolution - x) > 1e-6 || Math.abs(sampleZ * resolution - z) > 1e-6)
			throw new RangeError(`Position (${x}, ${z}) is not aligned to map resolution ${resolution}.`);

		const indexX = sampleX - Math.round(samples.x / resolution);
		const indexZ = sampleZ - Math.round(samples.z / resolution);

		if (indexX < 0 || indexX >= samples.width || indexZ < 0 || indexZ >= samples.height)
			throw new RangeError(`Position (${x}, ${z}) is outside the map region.`);

		return indexZ * samples.width + indexX;
	}
}
