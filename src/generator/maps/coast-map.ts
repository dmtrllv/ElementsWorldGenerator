import { MapData } from "./map-data";
import { MapGenerator } from "./map-generator";
import { ContinentalMap } from "./continental-map";
import { Region } from "../region";

export class CoastMap extends MapGenerator<Float32Array> {
	private readonly params = this.worldParams.geography.coastParams;

	public generate(region: Region): MapData<Float32Array> {
		this.validateRegion(region);

		const width = Math.ceil(this.worldParams.size.x);
		const height = Math.ceil(this.worldParams.size.z);
		const maxDistance = this.params.transitionWitdth.state;

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

		const continental = this.generator.getMap(ContinentalMap).generate(sampleRegion);
		const distance = new Float32Array(size);
		distance.fill(Infinity);

		const diagonal = Math.SQRT2;

		// identify land/sea boundaries
		for (let z = workRegion.z; z < workRegion.maxZ; z++) {
			for (let x = workRegion.x; x < workRegion.maxX; x++) {
				const index = (z - workRegion.z) * workWidth + (x - workRegion.x);
				const land = continental.get(x, z) >= 0.5;

				const left = x > 0 ? continental.get(x - 1, z) >= 0.5 : land;
				const right = x < width - 1 ? continental.get(x + 1, z) >= 0.5 : land;
				const top = z > 0 ? continental.get(x, z - 1) >= 0.5 : land;
				const bottom = z < height - 1 ? continental.get(x, z + 1) >= 0.5 : land;

				if (land !== left || land !== right || land !== top || land !== bottom)
					distance[index] = 0;
			}
		}

		// forward pass
		for (let z = 0; z < workHeight; z++) {
			for (let x = 0; x < workWidth; x++) {
				const index = z * workWidth + x;
				let value = distance[index]!;

				if (x > 0)
					value = Math.min(value, distance[index - 1]! + 1);

				if (z > 0)
					value = Math.min(value, distance[index - workWidth]! + 1);

				if (x > 0 && z > 0)
					value = Math.min(value, distance[index - workWidth - 1]! + diagonal);

				if (x < workWidth - 1 && z > 0)
					value = Math.min(value, distance[index - workWidth + 1]! + diagonal);

				distance[index] = value;
			}
		}

		// backward pass
		for (let z = workHeight - 1; z >= 0; z--) {
			for (let x = workWidth - 1; x >= 0; x--) {
				const index = z * workWidth + x;
				let value = distance[index]!;

				if (x < workWidth - 1)
					value = Math.min(value, distance[index + 1]! + 1);

				if (z < workHeight - 1)
					value = Math.min(value, distance[index + workWidth]! + 1);

				if (x < workWidth - 1 && z < workHeight - 1)
					value = Math.min(value, distance[index + workWidth + 1]! + diagonal);

				if (x > 0 && z < workHeight - 1)
					value = Math.min(value, distance[index + workWidth - 1]! + diagonal);

				distance[index] = value;
			}
		}

		// extract the requested region
		const buffer = new Float32Array(region.width * region.height);

		for (let z = region.z; z < region.maxZ; z++) {
			for (let x = region.x; x < region.maxX; x++) {
				const workIndex = (z - workRegion.z) * workWidth + (x - workRegion.x);
				const outputIndex = (z - region.z) * region.width + (x - region.x);

				const normalized = Math.max(0, Math.min(1, distance[workIndex]! / maxDistance));
				buffer[outputIndex] = this.params.falloff.evaluate(1 - normalized);
			}
		}

		return new MapData(region, buffer);
	}
}