import { Generator } from "./generator";
import { WorldParams } from "./world-params";

export class GenerationSession {
    public readonly worldParams: WorldParams;
    public readonly generator: Generator;

    private disposed = false;

    public constructor(worldParams: WorldParams) {
        this.worldParams = new WorldParams(worldParams.seed, worldParams.toProps());
        this.generator = new Generator(this.worldParams);
    }

    public dispose(): void {
        if (this.disposed)
            return;

        this.disposed = true;
        this.generator.dispose();
    }
}