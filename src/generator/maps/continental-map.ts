import { MapData } from "./map-data";
import { MapGenerator } from "./map-generator";
import type { Region } from "../region";

export class ContinentalMap extends MapGenerator<Float32Array> {
    private readonly params = this.worldParams.geography.continental;

    public generate(region: Region): MapData<Float32Array> {
        this.validateRegion(region);

        const buffer = new Float32Array(region.width * region.height);

        const min = this.params.normalization.min;
        const max = this.params.normalization.max;

        for (let z = region.z; z < region.maxZ; z++) {
            for (let x = region.x; x < region.maxX; x++) {
                const warp = this.params.warp.get(x, z);

                const nx = x + warp.x * this.params.warpStrength.state;
                const nz = z + warp.y * this.params.warpStrength.state;

                const noise = this.params.distribution.get(nx, nz);
                const normalized = (noise - min) / (max - min);
                const value = this.params.shape.evaluate(normalized);

                const index = (z - region.z) * region.width + (x - region.x);
                buffer[index] = value;
            }
        }

        return new MapData(region, buffer);
    }
}