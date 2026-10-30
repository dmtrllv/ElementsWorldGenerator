import { Block } from "./block";
import type { MaterialId } from "./materials";

export class Chunk {
	public readonly x: number;
	public readonly z: number;
	public readonly originX: number;
	public readonly originZ: number;
	public readonly width: number;
	public readonly depth: number;

	private readonly heights: Uint16Array;
	private readonly biomeIds: Uint32Array;
	private readonly blocks = new Map<bigint, Block>();

	public constructor(x: number, z: number, chunkSize: number, worldWidth: number, worldDepth: number) {
		this.x = x;
		this.z = z;
		this.originX = x * chunkSize;
		this.originZ = z * chunkSize;
		this.width = Math.min(chunkSize, worldWidth - this.originX);
		this.depth = Math.min(chunkSize, worldDepth - this.originZ);

		this.heights = new Uint16Array(this.width * this.depth);
		this.biomeIds = new Uint32Array(this.width * this.depth);
	}

	private getIndex(x: number, z: number): number {
		if (!Number.isInteger(x) || x < 0 || x >= this.width || !Number.isInteger(z) || z < 0 || z >= this.depth)
			throw new RangeError("Coordinates are outside the chunk.");

		return z * this.width + x;
	}

	public setHeight(x: number, z: number, height: number): void {
		this.heights[this.getIndex(x, z)] = height;
	}

	public getHeight(x: number, z: number): number {
		return this.heights[this.getIndex(x, z)];
	}

	public setBiome(x: number, z: number, biomeId: number): void {
		this.biomeIds[this.getIndex(x, z)] = biomeId;
	}

	public getBiome(x: number, z: number): number {
		return this.biomeIds[this.getIndex(x, z)];
	}

	private getBlockKey(x: number, y: number, z: number): bigint {
		if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || !Number.isSafeInteger(z))
			throw new RangeError("Block coordinates must be safe integers.");

		const encode = (value: number): bigint => {
			const n = BigInt(value);
			return n >= 0n ? n * 2n : -n * 2n - 1n;
		};

		return (encode(x) << 128n) | (encode(y) << 64n) | encode(z);
	}

	public setBlock(x: number, y: number, z: number, materialId: MaterialId): void {
		if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
			throw new RangeError("Block coordinates are outside the chunk.");

		this.blocks.set(this.getBlockKey(x, y, z), new Block(materialId));
	}

	public getBlock(x: number, y: number, z: number): Block | undefined {
		return this.blocks.get(this.getBlockKey(x, y, z));
	}

	public removeBlock(x: number, y: number, z: number): boolean {
		return this.blocks.delete(this.getBlockKey(x, y, z));
	}

	public *getBlocks(): IterableIterator<{ x: number; y: number; z: number; block: Block }> {
		for (const [key, block] of this.blocks) {
			const mask = (1n << 64n) - 1n;
			const bz = key & mask;
			const by = (key >> 64n) & mask;
			const bx = key >> 128n;

			const decode = (value: bigint): number => {
				return value % 2n === 0n ? Number(value / 2n) : Number(-(value + 1n) / 2n);
			};

			yield { x: decode(bx), y: decode(by), z: decode(bz), block };
		}
	}
}