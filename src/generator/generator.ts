import { type Vector2 as Vector2Type } from "three";
import { Chunk } from "./chunk";
import { MapData, type MapDataType, type TypedArray } from "./maps";
import { GenerationScope, Pass, type PassType } from "./passes";
import type { WorldParamsSnapshot } from "./world-params";
import { ThreadManager, type RootTask, type SharedOutput } from "./threads";

const threadManager = await ThreadManager.initialize();

export class Generator {
	public readonly worldParams: WorldParamsSnapshot;
	public readonly generation: number;

	private readonly mapRegistry = new Map<string, MapData>();
	private readonly pendingMaps = new Map<string, Promise<MapData>>();
	private readonly syncPromise: Promise<void>;

	public constructor(generation: number, worldParams: WorldParamsSnapshot) {
		this.generation = generation;
		this.worldParams = worldParams;

		this.syncPromise = threadManager.beginGeneration({
			seed: worldParams.seed,
			generation,
			worldParamsJson: JSON.stringify({
				size: worldParams.size,
				offset: worldParams.offset,
				chunkSize: worldParams.chunkSize,
				geography: worldParams.geography.toProps(),
				terrain: worldParams.terrain.toProps()
			})
		});
	}

	private createMapId(type: MapDataType<any, any>, scope: GenerationScope, resolution: number, chunk?: Vector2Type): string {
		let id = `${type.name}:${scope}:${resolution}`;

		if (scope === GenerationScope.Local && chunk)
			id += `:${chunk.x}:${chunk.y}`;

		return id;
	}

	private getMapFromDescriptor(type: MapDataType<any, any>, descriptor: SharedOutput): MapData {
		const meta = MapData.getMeta(type);
		const ArrayType = meta.type ?? Float32Array;
		const arena = threadManager.arenas[descriptor.workerId] as any;

		if (!arena)
			throw new Error(`Arena for worker ${descriptor.workerId} is unavailable!`);

		if (descriptor.mapId !== threadManager.taskTypes.getMapId(type))
			throw new Error(`Unexpected map ID for ${type.name}.`);

		const count = descriptor.samples.width * descriptor.samples.height;
		const expectedByteLength = count * ArrayType.BYTES_PER_ELEMENT;

		if (descriptor.byteLength !== expectedByteLength)
			throw new Error(`Invalid output byte length for ${type.name}.`);

		const data = new ArrayType(arena, descriptor.offset, count) as TypedArray;

		return new type(data, descriptor.samples);
	}

	private cacheTaskOutputs(taskId: number, PassType: PassType<any>, scope: GenerationScope, resolution: number, chunk?: Vector2Type): void {
		const outputTypes = threadManager.taskTypes.getOutputs(PassType);

		for (let i = 0; i < outputTypes.length; i++) {
			const OutputType = outputTypes[i]!;
			const descriptor = threadManager.getOutput(taskId, i);

			if (!descriptor)
				throw new Error(`Pass ${PassType.name} did not publish output ${OutputType.name}.`);

			const id = this.createMapId(OutputType, scope, resolution, chunk);

			if (!this.mapRegistry.has(id))
				this.mapRegistry.set(id, this.getMapFromDescriptor(OutputType, descriptor));
		}
	}

	private async generateMap(type: MapDataType<any, any>, scope: GenerationScope, chunk?: Vector2Type, resolution: number = 1): Promise<MapData> {
		await this.syncPromise;

		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		if (scope === GenerationScope.Local && !chunk)
			throw new Error("Local map generation requires chunk coordinates.");

		const mapChunk = scope === GenerationScope.Local ? chunk : undefined;
		const id = this.createMapId(type, scope, resolution, mapChunk);
		const existing = this.mapRegistry.get(id);

		if (existing)
			return existing;

		const pending = this.pendingMaps.get(id);

		if (pending)
			return pending;

		const promise = this.generateMany(type, scope, mapChunk ? [mapChunk] : [], resolution).then(maps => maps[0]!);
		this.pendingMaps.set(id, promise);

		try {
			return await promise;
		} finally {
			if (this.pendingMaps.get(id) === promise)
				this.pendingMaps.delete(id);
		}
	}

	public async generateMany(type: MapDataType<any, any>, scope: GenerationScope, chunks: readonly Vector2Type[] = [], resolution: number = 1): Promise<MapData[]> {
		await this.syncPromise;

		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		const PassType = Pass.fromOutputType(type);

		if (!PassType)
			throw new Error(`Could not find pass with output map ${type.name}.`);

		const passId = threadManager.taskTypes.getPassId(PassType);
		const requestedChunks = scope === GenerationScope.Local ? chunks : [undefined];
		const roots: RootTask[] = [];
		const rootChunks: (Vector2Type | undefined)[] = [];
		const seen = new Set<string>();

		for (const chunk of requestedChunks) {
			if (scope === GenerationScope.Local) {
				if (!chunk)
					throw new Error("Local map generation requires chunk coordinates.");

				new Chunk(chunk.x, chunk.y, this.worldParams);
			}

			const id = this.createMapId(type, scope, resolution, chunk);

			if (this.mapRegistry.has(id))
				continue;

			const key = `${passId}:${scope}:${resolution}:${chunk?.x ?? 0}:${chunk?.y ?? 0}`;

			if (seen.has(key))
				continue;

			seen.add(key);

			roots.push({
				pass: passId,
				scope: scope === GenerationScope.Global ? 0 : 1,
				resolution,
				chunkX: scope === GenerationScope.Local ? chunk!.x : 0,
				chunkZ: scope === GenerationScope.Local ? chunk!.y : 0
			});

			rootChunks.push(chunk);
		}

		if (roots.length > 0) {
			const taskIds = await threadManager.generateMany(this.generation, roots);

			for (let i = 0; i < taskIds.length; i++)
				this.cacheTaskOutputs(taskIds[i]!, PassType, scope, resolution, rootChunks[i]);
		}

		return requestedChunks.map(chunk => {
			const id = this.createMapId(type, scope, resolution, chunk);
			const map = this.mapRegistry.get(id);

			if (!map)
				throw new Error(`Pass ${PassType.name} did not generate requested map ${type.name}.`);

			return map;
		});
	}

	public generate(type: MapDataType<any, any>, scope: GenerationScope, chunk?: Vector2Type, resolution: number = 1): Promise<MapData> {
		return this.generateMap(type, scope, chunk, resolution);
	}

	public dispose(): void {
		this.pendingMaps.clear();
		this.mapRegistry.clear();
	}
}
