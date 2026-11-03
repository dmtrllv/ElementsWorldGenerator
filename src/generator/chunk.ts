
import { ChunkCoordinate } from "./chunk-coordinate";
import { Region } from "./region";
import type { MapData } from "./maps/map-data";
import type { MapGenerator, MapGeneratorType } from "./maps/map-generator";

export class Chunk {
	public readonly coordinate: ChunkCoordinate;
	public readonly region: Region;
	public readonly worldHeight: number;

	private readonly maps = new Map<MapGeneratorType<any>, MapData<any>>();

	private _blockIds: Uint16Array | null;

	public get blockIds(): Uint16Array {
		if (!this._blockIds)
			throw new Error("Cannot access a disposed chunk.");

		return this._blockIds;
	}

	public constructor(coordinate: ChunkCoordinate, region: Region, worldHeight: number) {
		if (!Number.isSafeInteger(worldHeight) || worldHeight <= 0)
			throw new RangeError("Chunk world height must be a positive safe integer.");

		const volume = region.width * region.height * worldHeight;

		if (!Number.isSafeInteger(volume) || volume > 0x7fffffff)
			throw new RangeError("Chunk volume exceeds the supported typed-array size.");

		this.coordinate = coordinate;
		this.region = region;
		this.worldHeight = worldHeight;
		this._blockIds = new Uint16Array(volume);
	}

	public getBlockId(x: number, y: number, z: number): number {
		return this.blockIds[this.getIndex(x, y, z)]!;
	}

	public setBlockId(x: number, y: number, z: number, id: number): void {
		if (!Number.isInteger(id) || id < 0 || id > 0xffff)
			throw new RangeError("Block ID must be an unsigned 16-bit integer.");

		this.blockIds[this.getIndex(x, y, z)] = id;
	}

	public clear(): void {
		this.blockIds.fill(0);
	}

	public dispose(): void {
		this._blockIds = null;
		this.maps.clear();
	}

	private getIndex(x: number, y: number, z: number): number {
		if (!this.region.contains(x, z) || !Number.isSafeInteger(y) || y < 0 || y >= this.worldHeight)
			throw new RangeError("Block coordinates are outside this chunk.");

		if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z) || !Number.isSafeInteger(y))
			throw new RangeError("Block coordinates must be safe integers.");

		if (!this.region.contains(x, z) || y < 0 || y >= this.worldHeight)
			throw new RangeError("Block coordinates are outside this chunk.");

		const localX = x - this.region.x;
		const localZ = z - this.region.z;

		return localX + this.region.width * (localZ + this.region.height * y);
	}

	public getMap<T extends MapGeneratorType<any>>(type: T): InstanceType<T> extends MapGenerator<infer U> ? MapData<U> : never {
		const map = this.maps.get(type);

		if (!map)
			throw new Error("Map has not been generated for this chunk.");

		return map as InstanceType<T> extends MapGenerator<infer U> ? MapData<U> : never;
	}

	public setMap<T extends MapGeneratorType<any>>(type: T, data: MapData<any>): void {
		this.maps.set(type, data);
	}

	public hasMap(type: MapGeneratorType<any>): boolean {
		return this.maps.has(type);
	}
}
