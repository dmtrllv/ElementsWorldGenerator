import { Region } from "../region";

export class MapData<T extends Float32Array | Uint8Array | Uint16Array> {
    public readonly region: Region;
    public readonly data: T;

    public constructor(region: Region, data: T) {
        const expectedLength = region.width * region.height;

        if (!Number.isSafeInteger(expectedLength) || expectedLength > 0x7fffffff)
            throw new RangeError("Map region exceeds the supported typed-array size.");

        if (data.length !== expectedLength)
            throw new RangeError("Map data length does not match its region.");

        this.region = region;
        this.data = data;
    }

    public get(x: number, z: number): number {
        const index = this.getIndex(x, z);
        return this.data[index]!;
    }

    public set(x: number, z: number, value: number): void {
        const index = this.getIndex(x, z);
        this.data[index] = value;
    }

    private getIndex(x: number, z: number): number {
        if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z))
            throw new RangeError("Map coordinates must be safe integers.");

        if (!this.region.contains(x, z))
            throw new RangeError("Map coordinates are outside this region.");

        return (z - this.region.z) * this.region.width + (x - this.region.x);
    }
}