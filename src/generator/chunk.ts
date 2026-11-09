import { Region } from "./region";
import type { WorldParamsSnapshot } from "./world-params";

export class Chunk {
	public readonly x: number;
	public readonly z: number;
	public readonly region: Region;

	public constructor(x: number, z: number, worldParams: WorldParamsSnapshot) {
		if (!Number.isSafeInteger(x) || x < 0 || !Number.isSafeInteger(z) || z < 0)
			throw new RangeError("Chunk coordinates must be non-negative safe integers.");

		const chunkSize = worldParams.chunkSize;

		if (!Number.isFinite(chunkSize) || chunkSize <= 0)
			throw new RangeError("Chunk size must be a positive finite number.");

		const worldRegion = worldParams.region;
		const chunksX = Math.ceil(worldRegion.width / chunkSize);
		const chunksZ = Math.ceil(worldRegion.height / chunkSize);

		if (x >= chunksX || z >= chunksZ)
			throw new RangeError(`Chunk (${x}, ${z}) is outside the world.`);

		this.x = x;
		this.z = z;

		const region = new Region(
			worldRegion.x + x * chunkSize,
			worldRegion.z + z * chunkSize,
			chunkSize,
			chunkSize
		);

		const intersection = region.intersection(worldRegion);

		if (!intersection)
			throw new RangeError(`Chunk (${x}, ${z}) does not intersect the world.`);

		this.region = intersection;
	}
}
