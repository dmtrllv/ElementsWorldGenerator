
import type { Vector3 } from "three";
import type { MaterialId } from "./materials";
import type { SurfaceMesh } from "./surfaces";
import type { BiomeRegistry } from "./biomes";
import { Block } from "./block";
import { Chunk } from "./chunk";
import type { ChunkGenerationResult } from "./worker-generator";

export class World {
	public readonly seed: number;
	public readonly size: Vector3;
	public readonly biomes: BiomeRegistry;

	private readonly surfaces = new Map<number, SurfaceMesh[]>();
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

	public addSurface(chunkX: number, chunkZ: number, surface: SurfaceMesh): void {
		const chunk = this.getChunkAt(chunkX, chunkZ);

		if (!chunk)
			throw new RangeError("Cannot add a surface to a non-existent chunk.");

		const key = chunkZ * this.chunkColumns + chunkX;
		const surfaces = this.surfaces.get(key) ?? [];

		surfaces.push(surface);
		this.surfaces.set(key, surfaces);
	}

	public getSurfaces(chunkX: number, chunkZ: number): readonly SurfaceMesh[] {
		const key = chunkZ * this.chunkColumns + chunkX;
		return this.surfaces.get(key) ?? [];
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

	public applyChunkGenerationResult(result: ChunkGenerationResult): void {
		const chunk = this.getChunkAt(result.chunkX, result.chunkZ, true);

		if (!chunk)
			throw new RangeError(`Chunk coordinates (${result.chunkX}, ${result.chunkZ}) are outside the world.`);

		if (result.width !== chunk.width || result.depth !== chunk.depth)
			throw new RangeError("Generated chunk dimensions do not match the world.");

		if (result.heights.length !== result.width * result.depth || result.biomeIds.length !== result.width * result.depth)
			throw new RangeError("Generated height or biome data has an invalid length.");

		if (result.blocks.length % 4 !== 0)
			throw new RangeError("Generated block data has an invalid length.");

		for (let z = 0; z < result.depth; z++) {
			for (let x = 0; x < result.width; x++) {
				const index = z * result.width + x;

				this.setHeight(chunk.originX + x, chunk.originZ + z, result.heights[index]);
				this.setBiome(chunk.originX + x, chunk.originZ + z, result.biomeIds[index]);
			}
		}

		for (let i = 0; i < result.blocks.length; i += 4) {
			const x = result.blocks[i];
			const y = result.blocks[i + 1];
			const z = result.blocks[i + 2];
			const materialId = result.blocks[i + 3];

			this.setBlock(chunk.originX + x, y, chunk.originZ + z, materialId);
		}
	}
}
