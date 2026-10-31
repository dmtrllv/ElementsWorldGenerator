import { Biome } from "./generator/biomes";
import { WorldSettings } from "./generator/world-settings";
import { Serializer } from "./serializer";
import type { MainEvents, WorkerEvents } from "./thread-manager";

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

on("sync", (data) => {
	const world = Serializer.deserialize(WorldSettings, data.world);
	const biomes = data.biomes.map(b => Serializer.deserialize(Biome, b));
	console.log("worker synced :D!", world, biomes);
	emit("synced", {});
})