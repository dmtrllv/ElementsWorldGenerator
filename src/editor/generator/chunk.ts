export class Chunk {
	public readonly x: number;
	public readonly z: number;
	public readonly originX: number;
	public readonly originZ: number;
	public readonly width: number;
	public readonly depth: number;

	public constructor(x: number, z: number, chunkSize: number, worldWidth: number, worldDepth: number) {
		this.x = x;
		this.z = z;
		this.originX = x * chunkSize;
		this.originZ = z * chunkSize;
		this.width = Math.min(chunkSize, worldWidth - this.originX);
		this.depth = Math.min(chunkSize, worldDepth - this.originZ);
	}
}