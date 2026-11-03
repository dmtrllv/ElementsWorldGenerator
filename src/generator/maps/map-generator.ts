
import type { Generator } from "../generator";
import type { Region } from "../region";
import type { MapData } from "./map-data";

export abstract class MapGenerator<T extends Float32Array | Uint8Array | Uint16Array> {
	public readonly generator: Generator;

	public get worldParams() {
		return this.generator.worldParams;
	}

	public constructor(generator: Generator) {
		this.generator = generator;
	}

	public abstract generate(region: Region): MapData<T>;

	public dispose(): void { }

	protected validateRegion(region: Region): void {
		const width = Math.ceil(this.worldParams.size.x);
		const height = Math.ceil(this.worldParams.size.z);

		if (region.x < 0 || region.z < 0 || region.maxX > width || region.maxZ > height)
			throw new RangeError("Map region is outside the world bounds.");
	}
}

export type MapGeneratorType<T extends MapGenerator<any>> = new (generator: Generator) => T;
