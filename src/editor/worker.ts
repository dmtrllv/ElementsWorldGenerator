import { Biome } from "./generator/biomes";
import { WorldSettings } from "./generator/world-settings";
import { Serializer } from "./serializer";
import type { MainEvents, WorkerEvents } from "./thread-manager";
import { WorkerGenerator, type ChunkGenerationRequest, type ChunkGenerationResult } from "./generator/worker-generator";

console.log("Hello!");

const emit = <K extends keyof WorkerEvents>(event: K, data: WorkerEvents[K]) => {
	globalThis.postMessage([event, data])
};

const handlers: Record<string, Function[]> = {};

const on = <K extends keyof MainEvents>(event: K, handler: (e: MainEvents[K]) => void): Function => {
	if (!handlers[event])
		handlers[event] = [];
	handlers[event].push(handler);
	return () => {
		const index = handlers[event].indexOf(handler);
		if (index > -1)
			handlers[event].splice(index, 1);
	};
}

globalThis.onmessage = e => {
	if (Array.isArray(e.data)) {
		const [event, data] = e.data;
		if (handlers[event])
			handlers[event].forEach(handler => handler(data));
	}
}

class WorkerRuntime {
	private settingsVersion = 0;
	private worldSettings?: WorldSettings;
	private biomes: Biome[] = [];
	private readonly generator = new WorkerGenerator();

	public get currentSettingsVersion(): number {
		return this.settingsVersion;
	}

	public generateChunk(request: ChunkGenerationRequest): ChunkGenerationResult {
		return this.generator.generateChunk(request);
	}

	public sync(data: MainEvents["sync"]): number {
		if (data.settingsVersion < this.settingsVersion)
			return this.settingsVersion;

		const worldSettings = Serializer.deserialize(WorldSettings, data.world);
		const biomes = data.biomes.map(b => Serializer.deserialize(Biome, b));

		this.generator.sync(worldSettings, biomes);

		this.worldSettings = worldSettings;
		this.biomes = biomes;
		this.settingsVersion = data.settingsVersion;

		return this.settingsVersion;
	}
}

const runtime = new WorkerRuntime();

let settingsVersion = 0;

on("sync", (data) => {
	const settingsVersion = runtime.sync(data);
	emit("synced", { settingsVersion });
});

on("generate", data => {
	if (data.settingsVersion !== runtime.currentSettingsVersion)
		return;

	const result = runtime.generateChunk({ chunkX: data.chunkX, chunkZ: data.chunkZ });

	emit("generated", {
		requestId: data.requestId,
		settingsVersion: data.settingsVersion,
		result,
	});
});