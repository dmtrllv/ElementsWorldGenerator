
import type { Vector2, Vector3 } from "three";
import { Region } from "./region";

export class ChunkCoordinate {
	public readonly x: number;
	public readonly z: number;

	public constructor(x: number, z: number) {
		if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z) || x < 0 || z < 0)
			throw new RangeError("Chunk coordinates must be non-negative safe integers.");

		this.x = x;
		this.z = z;
	}

	public toRegion(chunkSize: Vector2, worldSize: Vector3): Region | null {
		const { x: chunkWidth, y: chunkHeight } = chunkSize;

		if (!Number.isSafeInteger(chunkWidth) || !Number.isSafeInteger(chunkHeight) || chunkWidth <= 0 || chunkHeight <= 0)
			throw new RangeError("Chunk dimensions must be positive integers.");

		const worldWidth = Math.ceil(worldSize.x);
		const worldHeight = Math.ceil(worldSize.z);

		if (!Number.isSafeInteger(worldWidth) || !Number.isSafeInteger(worldHeight) || worldWidth <= 0 || worldHeight <= 0)
			throw new RangeError("World dimensions must be positive and have safe integer bounds.");

		const x = this.x * chunkWidth;
		const z = this.z * chunkHeight;

		if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z))
			throw new RangeError("Chunk origin exceeds the safe integer range.");

		if (x >= worldWidth || z >= worldHeight)
			return null;
		const w = Math.min(chunkWidth, worldWidth - x);
		const h = Math.min(chunkHeight, worldHeight - z);
		return new Region(x, z, w, h);
	}

	public equals(other: ChunkCoordinate): boolean {
		return this.x === other.x && this.z === other.z;
	}
}
