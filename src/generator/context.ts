import type { Region } from "./region";
import type { GenerationScope } from "./passes/pass";

export class GenerationContext {
	public readonly region: Region;
	public readonly scope: GenerationScope;

	private readonly worldRegion: Region;
	private readonly localRegion: Region | null;

	public constructor(region: Region, worldRegion: Region, scope: GenerationScope) {
		this.region = region;
		this.scope = scope;
		this.worldRegion = worldRegion;
		this.localRegion = scope === "Local" ? region : null;
	}

	public getIndex(x: number, z: number, scope: GenerationScope = this.scope): number {
		const region = scope === "Global" ? this.worldRegion : this.localRegion;

		if (!region)
			throw new Error("Local map indexing requires a local generation context.");

		if (!region.contains(x, z))
			throw new RangeError(`Position (${x}, ${z}) is outside the ${scope} map region.`);

		return (z - region.z) * region.width + (x - region.x);
	}
}