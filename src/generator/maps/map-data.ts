
import { Region } from "../region";

export class MapData<T extends Float32Array | Uint8Array | Uint16Array> {
    public readonly region: Region;
    public readonly data: T;

    public constructor(region: Region, data: T) {
        const expectedLength = region.width * region.height;

        if (data.length !== expectedLength)
            throw new RangeError("Map data length does not match its region.");

        this.region = region;
        this.data = data;
    }

    public get(x: number, z: number): number {
        if (!this.region.contains(x, z))
            throw new RangeError("Map coordinates are outside this region.");

        const index = (z - this.region.z) * this.region.width + (x - this.region.x);

        return this.data[index]!;
    }

    public set(x: number, z: number, value: number): void {
        if (!this.region.contains(x, z))
            throw new RangeError("Map coordinates are outside this region.");

        const index = (z - this.region.z) * this.region.width + (x - this.region.x);

        this.data[index] = value;
    }
}
