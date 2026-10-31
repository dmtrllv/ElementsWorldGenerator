import type { Editor } from "./editor";
import type { BiomeRegistry } from "./generator/biomes";
import type { WorldSettings } from "./generator/world-settings";
import { Serializer } from "./serializer";
import type { ChunkGenerationResult } from "./generator/worker-generator";

export class ThreadManager {
	private readonly threads: Thread[];
	private settingsVersion = 0;

	public constructor(editor: Editor) {
		this.threads = [new Thread()];
	}

	public async sync(worldSettings: WorldSettings, biomes: BiomeRegistry): Promise<void> {
		const settingsVersion = ++this.settingsVersion;

		await Promise.all(this.threads.map(thread => thread.sync(worldSettings, biomes, settingsVersion)));
	}

	public generateChunk(chunkX: number, chunkZ: number): Promise<ChunkGenerationResult> {
		return this.threads[0].generate(this.settingsVersion, chunkX, chunkZ);
	}
}

export class Thread {
	private nextRequestId = 0;

	public readonly worker: Worker;

	private readonly handlers: Record<string, Function[]> = {};
	private readonly onceHandlers: Record<string, Function[]> = {};

	public constructor() {
		this.worker = new Worker(new URL("./worker.js", import.meta.url), {
			type: "module"
		});
		this.worker.addEventListener("message", (e) => {
			if (Array.isArray(e.data)) {
				const [event, data] = e.data;
				if (this.handlers[event])
					this.handlers[event].forEach(handler => handler(data));
				if (this.onceHandlers[event])
					this.onceHandlers[event].forEach(handler => handler(data));
				this.onceHandlers[event] = [];
			}
		});
	}

	public sync(world: WorldSettings, biomes: BiomeRegistry, settingsVersion: number): Promise<void> {
		return new Promise<void>(res => {
			const unsubscribe = this.on("synced", data => {
				if (data.settingsVersion !== settingsVersion)
					return;

				unsubscribe();
				res();
			});

			this.emit("sync", {
				settingsVersion,
				world: Serializer.serialize(world),
				biomes: biomes.biomes.map(b => Serializer.serialize(b)),
			});
		});
	}

	public on<K extends keyof WorkerEvents>(event: K, handler: (e: WorkerEvents[K]) => void): Function {
		if (!this.handlers[event])
			this.handlers[event] = [];
		this.handlers[event].push(handler);
		return () => {
			const index = this.handlers[event].indexOf(handler);
			if (index > -1)
				this.handlers[event].splice(index, 1);
		};
	}

	public once<K extends keyof WorkerEvents>(event: K, handler: (e: WorkerEvents[K]) => void): Function {
		if (!this.onceHandlers[event])
			this.onceHandlers[event] = [];
		this.onceHandlers[event].push(handler);
		return () => {
			const index = this.onceHandlers[event].indexOf(handler);
			if (index > -1)
				this.onceHandlers[event].splice(index, 1);
		};
	}

	public emit = <K extends keyof MainEvents>(event: K, data: MainEvents[K]) => {
		this.worker.postMessage([event, data])
	}

	public generate(settingsVersion: number, chunkX: number, chunkZ: number): Promise<ChunkGenerationResult> {
		const requestId = ++this.nextRequestId;

		return new Promise<ChunkGenerationResult>(res => {
			const unsubscribe = this.on("generated", data => {
				if (data.requestId !== requestId)
					return;

				unsubscribe();
				res(data.result);
			});

			this.emit("generate", { requestId, settingsVersion, chunkX, chunkZ });
		});
	}
}

export type WorkerEvents = {
	synced: { settingsVersion: number };
	generated: {
		requestId: number;
		settingsVersion: number;
		result: ChunkGenerationResult;
	};
};

export type MainEvents = {
	sync: { settingsVersion: number; world: string; biomes: string[] };
	generate: {
		requestId: number;
		settingsVersion: number;
		chunkX: number;
		chunkZ: number;
	};
};