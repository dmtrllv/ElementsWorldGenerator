export class Region {
	public readonly x: number;
	public readonly z: number;
	public readonly width: number;
	public readonly height: number;

	public get maxX(): number {
		return this.x + this.width;
	}

	public get maxZ(): number {
		return this.z + this.height;
	}

	public constructor(x: number, z: number, width: number, height: number) {
		this.x = x;
		this.z = z;
		this.width = width;
		this.height = height;
	}

	public contains(x: number, z: number): boolean {
		return x >= this.x && x < this.maxX && z >= this.z && z < this.maxZ;
	}

	public intersects(other: Region): boolean {
		return this.x < other.maxX && this.maxX > other.x && this.z < other.maxZ && this.maxZ > other.z;
	}

	public intersection(other: Region): Region | null {
		const x = Math.max(this.x, other.x);
		const z = Math.max(this.z, other.z);
		const maxX = Math.min(this.maxX, other.maxX);
		const maxZ = Math.min(this.maxZ, other.maxZ);

		if (x >= maxX || z >= maxZ)
			return null;

		return new Region(x, z, maxX - x, maxZ - z);
	}

	public expand(amount: number): Region {
		if (!Number.isSafeInteger(amount) || amount < 0)
			throw new RangeError("Expansion must be a non-negative safe integer.");

		return new Region(
			this.x - amount,
			this.z - amount,
			this.width + amount * 2,
			this.height + amount * 2
		);
	}
}
