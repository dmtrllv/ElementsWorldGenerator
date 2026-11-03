
import type { Generator } from "../generator";
import type { Region } from "../region";
import type { MapData } from "./map-data";

export abstract class MapGenerator<T extends Float32Array | Uint8Array | Uint16Array> {
    public readonly generator: Generator;

    public get worldParams() {
        return this.generator.worldParams;
    }

    public constructor(generator: Generator) {
        this.generator = generator;
    }

    public abstract generate(region: Region): MapData<T>;

    public dispose(): void {

    }
}

export type MapGeneratorType<T extends MapGenerator<any>> = new (generator: Generator) => T;
