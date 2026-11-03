import { Generator } from "./generator";
import { WorldParams } from "./world-params";
import { ChunkManager } from "./chunk-manager";

export class GenerationSession {
	public readonly worldParams: WorldParams;
	public readonly generator: Generator;
	public readonly chunks: ChunkManager;

	private disposed = false;

	public constructor(worldParams: WorldParams) {
		this.worldParams = new WorldParams(worldParams.seed, worldParams.toProps());
		this.generator = new Generator(this.worldParams);
		this.chunks = new ChunkManager(this.worldParams);
	}

	public dispose(): void {
		if (this.disposed)
			return;

		this.disposed = true;
		this.chunks.dispose();
		this.generator.dispose();
	}
}