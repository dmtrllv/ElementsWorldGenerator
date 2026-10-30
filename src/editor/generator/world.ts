
import type { Vector3 } from "three";
import type { MaterialId } from "./materials";
import type { SurfaceMesh } from "./surfaces";
import type { BiomeRegistry } from "./biomes";
import { Block } from "./block";
import { Chunk } from "./chunk";

export class World {
	public readonly seed: number;
	public readonly size: Vector3;
	public readonly biomes: BiomeRegistry;

	private readonly surfaces: SurfaceMesh[] = [];
	public readonly chunkSize: number;
	private readonly chunks = new Map<number, Chunk>();
	private readonly chunkColumns: number;

	public get width() { return this.size.x; }
	public get height() { return this.size.y; }
	public get depth() { return this.size.z; }

	public get blockCount(): number {
		let count = 0;

		for (const chunk of this.chunks.values()) {
			for (const _ of chunk.getBlocks())
				count++;
		}

		return count;
	}

	public constructor(seed: number, size: Vector3, biomes: BiomeRegistry, chunkSize: number) {
		if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0)
			throw new RangeError("Chunk size must be a positive safe integer.");

		this.seed = seed;
		this.size = size.clone();
		this.chunkColumns = Math.ceil(size.x / chunkSize);
		this.biomes = biomes;
		this.chunkSize = chunkSize;
	}

	private getChunk(x: number, z: number, create = false): Chunk | undefined {
		return this.getChunkAt(Math.floor(x / this.chunkSize), Math.floor(z / this.chunkSize), create);
	}

	public setBlock(x: number, y: number, z: number, materialId: MaterialId): void {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth)
			throw new RangeError("Block coordinates are outside the world.");

		const chunk = this.getChunk(x, z, true)!;
		chunk.setBlock(x - chunk.originX, y, z - chunk.originZ, materialId);
	}

	public getBlock(x: number, y: number, z: number): Block | undefined {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth)
			return undefined;

		const chunk = this.getChunk(x, z);
		return chunk?.getBlock(x - chunk.originX, y, z - chunk.originZ);
	}

	public removeBlock(x: number, y: number, z: number): boolean {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth)
			return false;

		const chunk = this.getChunk(x, z);
		return chunk?.removeBlock(x - chunk.originX, y, z - chunk.originZ) ?? false;
	}

	public *getBlocks(): IterableIterator<{ x: number; y: number; z: number; block: Block }> {
		for (const chunk of this.chunks.values()) {
			for (const entry of chunk.getBlocks()) {
				yield {
					x: entry.x + chunk.originX,
					y: entry.y,
					z: entry.z + chunk.originZ,
					block: entry.block
				};
			}
		}
	}

	public setHeight(x: number, z: number, height: number): void {
		if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
			throw new RangeError("Height coordinates are outside the world.");

		const chunk = this.getChunk(x, z, true)!;
		chunk.setHeight(x - chunk.originX, z - chunk.originZ, height);
	}

	public getHeight(x: number, z: number): number {
		if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
			throw new RangeError("Height coordinates are outside the world.");

		const chunk = this.getChunk(x, z);
		return chunk?.getHeight(x - chunk.originX, z - chunk.originZ) ?? 0;
	}

	public setBiome(x: number, z: number, biomeId: number): void {
		if (!Number.isInteger(biomeId) || biomeId < 0 || biomeId > 0xFFFFFFFF)
			throw new RangeError("Biome ID must be a valid unsigned 32-bit integer.");

		if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
			throw new RangeError("Biome coordinates are outside the world.");

		const chunk = this.getChunk(x, z, true)!;
		chunk.setBiome(x - chunk.originX, z - chunk.originZ, biomeId);
	}

	public getBiome(x: number, z: number): number {
		if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
			throw new RangeError("Biome coordinates are outside the world.");

		const chunk = this.getChunk(x, z);
		return chunk?.getBiome(x - chunk.originX, z - chunk.originZ) ?? 0;
	}

	public addSurface(surface: SurfaceMesh): void {
		this.surfaces.push(surface);
	}

	public getSurfaces(): readonly SurfaceMesh[] {
		return this.surfaces;
	}

	public *getChunks(): IterableIterator<Chunk> {
		yield* this.chunks.values();
	}

	public getChunkAt(chunkX: number, chunkZ: number, create = false): Chunk | undefined {
		if (!Number.isSafeInteger(chunkX) || chunkX < 0 || chunkX >= this.chunkColumns)
			return undefined;

		const chunkRows = Math.ceil(this.depth / this.chunkSize);

		if (!Number.isSafeInteger(chunkZ) || chunkZ < 0 || chunkZ >= chunkRows)
			return undefined;

		const key = chunkZ * this.chunkColumns + chunkX;
		let chunk = this.chunks.get(key);

		if (!chunk && create) {
			chunk = new Chunk(chunkX, chunkZ, this.chunkSize, this.width, this.depth);
			this.chunks.set(key, chunk);
		}

		return chunk;
	}
}
