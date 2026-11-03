
import { Chunk } from "./chunk";
import { ChunkCoordinate } from "./chunk-coordinate";
import type { WorldParams } from "./world-params";

export class ChunkManager {
	public readonly worldParams: WorldParams;

	private readonly chunks = new Map<string, Chunk>();
	private disposed = false;

	public constructor(worldParams: WorldParams) {
		this.worldParams = worldParams;
	}

	public get(coordinate: ChunkCoordinate): Chunk | null {
		this.assertActive();
		return this.chunks.get(this.getKey(coordinate)) ?? null;
	}

	public getOrCreate(coordinate: ChunkCoordinate): Chunk | null {
		this.assertActive();

		const key = this.getKey(coordinate);
		const existing = this.chunks.get(key);

		if (existing)
			return existing;

		const region = coordinate.toRegion(this.worldParams.chunkSize, this.worldParams.size);

		if (!region)
			return null;

		const worldHeight = Math.ceil(this.worldParams.size.y);
		const chunk = new Chunk(coordinate, region, worldHeight);

		this.chunks.set(key, chunk);

		return chunk;
	}

	public unload(coordinate: ChunkCoordinate): boolean {
		this.assertActive();

		const key = this.getKey(coordinate);
		const chunk = this.chunks.get(key);

		if (!chunk)
			return false;

		chunk.dispose();
		this.chunks.delete(key);

		return true;
	}

	public *values(): IterableIterator<Chunk> {
		this.assertActive();
		yield* this.chunks.values();
	}

	public dispose(): void {
		if (this.disposed)
			return;

		this.disposed = true;

		for (const chunk of this.chunks.values())
			chunk.dispose();

		this.chunks.clear();
	}

	private getKey(coordinate: ChunkCoordinate): string {
		return `${coordinate.x},${coordinate.z}`;
	}

	private assertActive(): void {
		if (this.disposed)
			throw new Error("Cannot access a disposed chunk manager.");
	}
}
