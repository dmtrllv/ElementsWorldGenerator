import type { MaterialId } from "./materials";

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
