
import type { Vector3 } from "three";
import type { MaterialId } from "./materials";
import type { SurfaceMesh } from "./surfaces";

export const BLOCK_SIZE = 16;
export const VOXELS_PER_BLOCK = BLOCK_SIZE * BLOCK_SIZE * BLOCK_SIZE;

export class Block {
	public readonly materialId: MaterialId;
	private voxels: Uint32Array | null = null;

	public constructor(materialId: MaterialId) {
		this.materialId = materialId;
	}

	public get isRefined(): boolean {
		return this.voxels !== null;
	}

	public getVoxel(x: number, y: number, z: number): MaterialId | 0 {
		const index = this.getVoxelIndex(x, y, z);
		return this.voxels ? this.voxels[index] : this.materialId;
	}

	public setVoxel(x: number, y: number, z: number, materialId: MaterialId | 0): void {
		if (!Number.isSafeInteger(materialId) || materialId < 0 || materialId > 0xFFFFFFFF)
			throw new RangeError("Voxel material ID must be a valid unsigned 32-bit integer.");

		const index = this.getVoxelIndex(x, y, z);

		if (!this.voxels && materialId === this.materialId)
			return;

		if (!this.voxels) {
			this.voxels = new Uint32Array(VOXELS_PER_BLOCK);
			this.voxels.fill(this.materialId);
		}

		this.voxels[index] = materialId;
	}

	private getVoxelIndex(x: number, y: number, z: number): number {
		if (!Number.isInteger(x) || x < 0 || x >= BLOCK_SIZE ||
			!Number.isInteger(y) || y < 0 || y >= BLOCK_SIZE ||
			!Number.isInteger(z) || z < 0 || z >= BLOCK_SIZE)
			throw new RangeError(`Voxel coordinates must be within 0..${BLOCK_SIZE - 1}.`);

		return x + BLOCK_SIZE * (z + BLOCK_SIZE * y);
	}
}



export class World {
	public readonly seed: number;
	public readonly size: Vector3;

	private readonly heights: Uint16Array;
	private readonly blocks = new Map<bigint, Block>();
	private readonly surfaces: SurfaceMesh[] = [];

	public get width() { return this.size.x; }
	public get height() { return this.size.y; }
	public get depth() { return this.size.z; }

	public get blockCount() { return this.blocks.size; }

	public constructor(seed: number, size: Vector3) {
		this.seed = seed;
		this.size = size.clone();
		this.heights = new Uint16Array(size.x * size.z);
	}

	private getBlockKey(x: number, y: number, z: number): bigint {
		if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || !Number.isSafeInteger(z))
			throw new RangeError("Block coordinates must be safe integers.");

		const encode = (value: number): bigint => {
			const n = BigInt(value);
			return n >= 0n ? n * 2n : -n * 2n - 1n;
		};

		const bx = encode(x);
		const by = encode(y);
		const bz = encode(z);

		return (bx << 128n) | (by << 64n) | bz;
	}

	public setBlock(x: number, y: number, z: number, materialId: MaterialId): void {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth)
			throw new RangeError("Block coordinates are outside the world.");

		this.blocks.set(this.getBlockKey(x, y, z), new Block(materialId));
	}

	public getBlock(x: number, y: number, z: number): Block | undefined {
		return this.blocks.get(this.getBlockKey(x, y, z));
	}

	public removeBlock(x: number, y: number, z: number): boolean {
		return this.blocks.delete(this.getBlockKey(x, y, z));
	}

	public *getBlocks(): IterableIterator<{ x: number; y: number; z: number; block: Block }> {
		// Coordinates are decoded from the key below.
		for (const [key, block] of this.blocks) {
			const mask = (1n << 64n) - 1n;
			const bz = key & mask;
			const by = (key >> 64n) & mask;
			const bx = key >> 128n;

			const decode = (value: bigint): number => {
				const n = value % 2n === 0n ? value / 2n : -(value + 1n) / 2n;
				return Number(n);
			};

			yield { x: decode(bx), y: decode(by), z: decode(bz), block };
		}
	}

	public setHeight(x: number, z: number, height: number): void {
		if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
			throw new RangeError("Height coordinates are outside the world.");

		this.heights[z * this.width + x] = height;
	}

	public getHeight(x: number, z: number): number {
		if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
			throw new RangeError("Height coordinates are outside the world.");

		return this.heights[z * this.width + x];
	}

	public addSurface(surface: SurfaceMesh): void {
		this.surfaces.push(surface);
	}

	public getSurfaces(): readonly SurfaceMesh[] {
		return this.surfaces;
	}
}
