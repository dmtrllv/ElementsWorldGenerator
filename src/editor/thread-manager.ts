import type { Editor } from "./editor";
import type { BiomeRegistry } from "./generator/biomes";
import type { WorldSettings } from "./generator/world-settings";
import { Serializer } from "./serializer";

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
}

export class Thread {
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
	};
}

export type WorkerEvents = {
	synced: {
		settingsVersion: number;
	}
}

export type MainEvents = {
	sync: {
		settingsVersion: number;
		world: string;
		biomes: string[];
	};
}