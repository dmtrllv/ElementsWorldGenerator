import { MapData } from "./map-data";
import { MapGenerator } from "./map-generator";
import { OceanMap } from "./ocean-map";
import { Region } from "../region";

export class CoastMap extends MapGenerator<Float32Array> {
	private readonly params = this.worldParams.geography.coastParams;

	public generate(region: Region): MapData<Float32Array> {
		this.validateRegion(region);

		const width = Math.ceil(this.worldParams.size.x);
		const height = Math.ceil(this.worldParams.size.z);
		const maxDistance = this.params.transitionWidth.state;

		if (!Number.isFinite(maxDistance) || maxDistance <= 0)
			throw new RangeError("Coast transition width must be a positive finite number.");

		const padding = Math.ceil(maxDistance) + 1;

		const workX = Math.max(0, region.x - padding);
		const workZ = Math.max(0, region.z - padding);
		const workMaxX = Math.min(width, region.maxX + padding);
		const workMaxZ = Math.min(height, region.maxZ + padding);
		const workRegion = new Region(workX, workZ, workMaxX - workX, workMaxZ - workZ);

		const sampleX = Math.max(0, workRegion.x - 1);
		const sampleZ = Math.max(0, workRegion.z - 1);
		const sampleMaxX = Math.min(width, workRegion.maxX + 1);
		const sampleMaxZ = Math.min(height, workRegion.maxZ + 1);
		const sampleRegion = new Region(sampleX, sampleZ, sampleMaxX - sampleX, sampleMaxZ - sampleZ);

		const workWidth = workRegion.width;
		const workHeight = workRegion.height;
		const size = workWidth * workHeight;

		const ocean = this.generator.getMap(OceanMap).generate(sampleRegion);
		const distance = new Float32Array(size);
		distance.fill(Infinity);

		const isOcean = (x: number, z: number): boolean => ocean.get(x, z) >= 0.5;
		const diagonal = Math.SQRT2;

		// identify land cells adjacent to the ocean
		for (let z = workRegion.z; z < workRegion.maxZ; z++) {
			for (let x = workRegion.x; x < workRegion.maxX; x++) {
				if (isOcean(x, z))
					continue;

				const left = x > 0 && isOcean(x - 1, z);
				const right = x < width - 1 && isOcean(x + 1, z);
				const top = z > 0 && isOcean(x, z - 1);
				const bottom = z < height - 1 && isOcean(x, z + 1);

				if (left || right || top || bottom) {
					const index = (z - workRegion.z) * workWidth + (x - workRegion.x);
					distance[index] = 0;
				}
			}
		}

		// forward pass
		for (let z = 0; z < workHeight; z++) {
			for (let x = 0; x < workWidth; x++) {
				const worldX = workRegion.x + x;
				const worldZ = workRegion.z + z;

				if (isOcean(worldX, worldZ))
					continue;

				const index = z * workWidth + x;
				let value = distance[index]!;

				if (x > 0 && !isOcean(worldX - 1, worldZ))
					value = Math.min(value, distance[index - 1]! + 1);

				if (z > 0 && !isOcean(worldX, worldZ - 1))
					value = Math.min(value, distance[index - workWidth]! + 1);

				if (x > 0 && z > 0 && !isOcean(worldX - 1, worldZ - 1))
					value = Math.min(value, distance[index - workWidth - 1]! + diagonal);

				if (x < workWidth - 1 && z > 0 && !isOcean(worldX + 1, worldZ - 1))
					value = Math.min(value, distance[index - workWidth + 1]! + diagonal);

				distance[index] = value;
			}
		}

		// backward pass
		for (let z = workHeight - 1; z >= 0; z--) {
			for (let x = workWidth - 1; x >= 0; x--) {
				const worldX = workRegion.x + x;
				const worldZ = workRegion.z + z;

				if (isOcean(worldX, worldZ))
					continue;

				const index = z * workWidth + x;
				let value = distance[index]!;

				if (x < workWidth - 1 && !isOcean(worldX + 1, worldZ))
					value = Math.min(value, distance[index + 1]! + 1);

				if (z < workHeight - 1 && !isOcean(worldX, worldZ + 1))
					value = Math.min(value, distance[index + workWidth]! + 1);

				if (x < workWidth - 1 && z < workHeight - 1 && !isOcean(worldX + 1, worldZ + 1))
					value = Math.min(value, distance[index + workWidth + 1]! + diagonal);

				if (x > 0 && z < workHeight - 1 && !isOcean(worldX - 1, worldZ + 1))
					value = Math.min(value, distance[index + workWidth - 1]! + diagonal);

				distance[index] = value;
			}
		}

		// extract the requested region
		const buffer = new Float32Array(region.width * region.height);

		for (let z = region.z; z < region.maxZ; z++) {
			for (let x = region.x; x < region.maxX; x++) {
				const outputIndex = (z - region.z) * region.width + (x - region.x);

				if (isOcean(x, z))
					continue;

				const workIndex = (z - workRegion.z) * workWidth + (x - workRegion.x);
				const value = distance[workIndex]!;

				if (!Number.isFinite(value))
					continue;

				const normalized = Math.max(0, Math.min(1, value / maxDistance));
				buffer[outputIndex] = this.params.falloff.evaluate(1 - normalized);
			}
		}

		return new MapData(region, buffer);
	}
}