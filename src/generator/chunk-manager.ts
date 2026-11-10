import { Vector2 } from "three";
import type { Generator } from "./generator";
import { GenerationScope } from "./passes/pass";
import { Region } from "./region";
import { Chunk } from "./chunk";

export class ChunkManager {
	private readonly chunks = new Map<string, Chunk>();
	private readonly generator: Generator;

	public constructor(generator: Generator) {
		this.generator = generator;
	}

	public getChunk(x: number, z: number): Chunk {
		const id = `${x}:${z}`;

		if (!this.chunks.has(id))
			this.chunks.set(id, new Chunk(x, z, this.generator.worldParams));

		return this.chunks.get(id)!;
	}

	public getChunkAt(x: number, z: number): Chunk {
		const worldRegion = this.generator.worldParams.region;

		if (!worldRegion.contains(x, z))
			throw new RangeError(`Position (${x}, ${z}) is outside the world.`);

		const chunkSize = this.generator.worldParams.chunkSize;
		const chunkX = Math.floor((x - worldRegion.x) / chunkSize);
		const chunkZ = Math.floor((z - worldRegion.z) / chunkSize);

		return this.getChunk(chunkX, chunkZ);
	}

	public getChunks(region: Region): Chunk[] {
		const worldRegion = this.generator.worldParams.region;
		const intersection = region.intersection(worldRegion);

		if (!intersection)
			return [];

		const chunkSize = this.generator.worldParams.chunkSize;

		const minX = Math.floor((intersection.x - worldRegion.x) / chunkSize);
		const minZ = Math.floor((intersection.z - worldRegion.z) / chunkSize);
		const maxX = Math.ceil((intersection.maxX - worldRegion.x) / chunkSize) - 1;
		const maxZ = Math.ceil((intersection.maxZ - worldRegion.z) / chunkSize) - 1;

		const chunks: Chunk[] = [];

		for (let z = minZ; z <= maxZ; z++) {
			for (let x = minX; x <= maxX; x++)
				chunks.push(this.getChunk(x, z));
		}

		return chunks;
	}

	public generateMap(type: any, chunk: Chunk, resolution: number = 1) {
		return this.generator.generate(type, GenerationScope.Local, new Vector2(chunk.x, chunk.z), resolution);
	}

	public generateMaps(type: any, chunks: readonly Chunk[], resolution: number = 1) {
		return this.generator.generateMany(type, GenerationScope.Local, chunks.map(chunk => new Vector2(chunk.x, chunk.z)), resolution);
	}

	public dispose(): void {
		this.chunks.clear();
	}
}
