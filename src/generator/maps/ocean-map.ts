import { MapData } from "./map-data";
import { MapGenerator } from "./map-generator";
import { ContinentalMap } from "./continental-map";
import type { Region } from "../region";

export class OceanMap extends MapGenerator<Float32Array> {
    private readonly params = this.worldParams.geography.oceanParams;

    public generate(region: Region): MapData<Float32Array> {
        this.validateRegion(region);

        const continental = this.generator.getMap(ContinentalMap).generate(region);
        const buffer = new Float32Array(region.width * region.height);

        for (let z = region.z; z < region.maxZ; z++) {
            for (let x = region.x; x < region.maxX; x++) {
                const index = (z - region.z) * region.width + (x - region.x);
                const value = continental.get(x, z);

                if (value >= 0.5) {
                    buffer[index] = 0;
                    continue;
                }

                const oceanicness = 1 - value * 2;
                const distribution = (this.params.distribution.get(x, z) + 1) * 0.5;
                const shelf = (this.params.shelf.get(x, z) + 1) * 0.5;

                const variation = distribution * (1 - shelf * oceanicness);
                buffer[index] = Math.max(0, Math.min(1, oceanicness * variation));
            }
        }

        return new MapData(region, buffer);
    }
}