import { MapData, type MapDataType } from "../maps";
import { Pass, type PassType } from "../passes";
import { WorldParams, type WorldParamsSnapshot } from "../world-params";
import type { GenerateEvent, SyncEvent } from "./manager";
import { events } from "./worker/events";

export class GeneratorWorker {
	public static readonly instance = new GeneratorWorker();

	private seed: number = 0;
	private generation: number = -1;
	private worldParams: WorldParamsSnapshot | null = null;

	private readonly passRegistry = new Map<PassType<any>, Pass>();
	private readonly passMapper = new Map<MapDataType<any, any>, Pass>();

	private getPassFromMap(type: MapDataType<any, any>) {
		if (this.passMapper.has(type))
			return this.passMapper.get(type)!;

		const PassType = Pass.fromOutputType(type);
		if (!PassType)
			throw new Error(`Could not find pass with output map ${type.name}!`);

		const pass = this.getPass(PassType);
		this.passMapper.set(type, pass);
		return pass;
	}

	private getPass(PassType: PassType<any>) {
		if (!this.passRegistry.has(PassType))
			this.passRegistry.set(PassType, new PassType(this.worldParams!));

		return this.passRegistry.get(PassType)!;
	}

	private constructor() {
		events.on("init", ({ }) => { });
		events.on("sync", this.sync);
		events.on("generate", this.generate);
	}

	private readonly sync = ({ generation, seed, worldParamsJson }: SyncEvent) => {
		if (this.generation >= generation)
			return;

		this.seed = seed;
		this.worldParams = new WorldParams(seed, JSON.parse(worldParamsJson));
		console.log("synced", this)
	};

	private readonly generate = ({ mapId, type }: GenerateEvent) => {
		if (!this.worldParams) {
			console.warn("Worker is not synced!");
			return;
		}

		const MapType = MapData.fromName(type);
		if (!MapType)
			throw new Error(`Missing map type ${type}!`);

		const pass = this.getPassFromMap(MapType);
		const passMeta = Pass.getMeta().get(pass.constructor as any)!;

		console.log(`generate ${mapId}`, pass, passMeta);
	}
}
