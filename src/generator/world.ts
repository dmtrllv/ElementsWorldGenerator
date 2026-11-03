import { observable } from "../reactive";
import { GenerationSession } from "./generation-session";
import { WorldParams, type WorldParamProps } from "./world-params";

@observable
export class World {
    @observable
    public readonly worldParams: WorldParams;

    @observable
    public generation: GenerationSession;

    public constructor(seed: number, worldParamProps: WorldParamProps) {
        this.worldParams = new WorldParams(seed, worldParamProps);
        this.generation = new GenerationSession(this.worldParams);
    }

    public get generator() {
        return this.generation.generator;
    }

    public regenerate(): void {
        const next = new GenerationSession(this.worldParams);
        const previous = this.generation;

        this.generation = next;
        previous.dispose();
    }

    public dispose(): void {
        this.generation.dispose();
    }
}