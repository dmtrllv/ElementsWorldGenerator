import { Vector2, type Vector2 as Vector2Type } from "three";
import { Chunk } from "./chunk";
import { MapData, type MapDataType, type TypedArray } from "./maps";
import { GenerationScope, isMapDependency, Pass, type PassType } from "./passes/pass";
import type { WorldParamsSnapshot } from "./world-params";
import { ThreadManager, type MapBufferDescriptor } from "./threads";

const threadManager = await ThreadManager.initialize();

export class Generator {
	public readonly worldParams: WorldParamsSnapshot;

	private readonly mapRegistry = new Map<string, MapData>();
	private readonly pendingMaps = new Map<string, Promise<MapData>>();
	private readonly passRegistry = new Map<PassType<any>, Pass>();
	private readonly passMapper = new Map<MapDataType<any, any>, Pass>();
	private readonly pendingPasses = new Map<string, Promise<void>>();

	private readonly syncPromise: Promise<void>;

	public readonly generation: number;

	public constructor(generation: number, worldParams: WorldParamsSnapshot) {
		this.generation = generation;
		this.worldParams = worldParams;

		this.syncPromise = threadManager.broadcast("sync", {
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

	private createPassId(pass: Pass, scope: GenerationScope, resolution: number, chunk?: Vector2): string {
		let id = `${pass.constructor.name}:${scope}:${resolution}`;

		if (scope === GenerationScope.Local && chunk)
			id += `:${chunk.x}:${chunk.y}`;

		return id;
	}

	private createMapId(type: MapDataType<any, any>, scope: GenerationScope, resolution: number, chunk?: Vector2Type): string {
		let id = `${type.name}:${scope}:${resolution}`;

		if (scope === GenerationScope.Local && chunk)
			id += `:${chunk.x}:${chunk.y}`;

		return id;
	}

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
			this.passRegistry.set(PassType, new PassType(this.worldParams));

		return this.passRegistry.get(PassType)!;
	}

	private getMapFromDescriptor(type: MapDataType<any, any>, descriptor: MapBufferDescriptor) {
		const meta = MapData.getMeta(type);
		const ArrayType = meta.type ?? Float32Array;
		const data = new ArrayType(descriptor.buffer as any) as TypedArray;

		return new type(data, descriptor.samples);
	}

	private async resolveMapDependencies(pass: Pass, scope: GenerationScope, chunk?: Vector2Type, resolution: number = 1) {
		const passMeta = Pass.getMeta().get(pass.constructor as any)!;
		const inputs: Record<string, MapBufferDescriptor> = {};

		await Promise.all(Object.entries(passMeta.dependencies).map(async ([key, dep]) => {
			if (!dep)
				throw new Error("Could not get dependency!");

			if (!isMapDependency(dep))
				return;

			const depScope = dep.scope ?? scope;
			const depResolution = dep.resolution ?? resolution;
			const depChunk = depScope === GenerationScope.Local ? chunk : undefined;
			const res = typeof depResolution === "function" ? depResolution(this.worldParams) : depResolution;

			const map = await this.generate(dep.type, depScope, depChunk, res);

			if (!(map.data.buffer instanceof SharedArrayBuffer))
				throw new Error(`Map ${dep.type.name} does not use a SharedArrayBuffer!`);

			inputs[key] = {
				type: dep.type.name,
				buffer: map.data.buffer,
				samples: map.samples
			};
		}));

		return inputs;
	}

	private async generateMap(type: MapDataType<any, any>, scope: GenerationScope, chunk?: Vector2Type, resolution: number = 1): Promise<MapData> {
		await this.syncPromise;

		const mapChunk = scope === GenerationScope.Local ? chunk : undefined;
		const id = this.createMapId(type, scope, resolution, mapChunk);

		const existing = this.mapRegistry.get(id);

		if (existing)
			return existing;

		const pending = this.pendingMaps.get(id);

		if (pending)
			return pending;

		const promise = this.generateMapInternal(type, scope, mapChunk, resolution, id);
		this.pendingMaps.set(id, promise);

		try {
			return await promise;
		} finally {
			this.pendingMaps.delete(id);
		}
	}

	private async generateMapInternal(type: MapDataType<any, any>, scope: GenerationScope, chunk: Vector2 | undefined, resolution: number, id: string): Promise<MapData> {
		const pass = this.getPassFromMap(type);
		const inputs = await this.resolveMapDependencies(pass, scope, chunk, resolution);

		const passId = this.createPassId(pass, scope, resolution, chunk);
		let pending = this.pendingPasses.get(passId);

		if (!pending) {
			pending = (async () => {
				const region = scope === GenerationScope.Local ?
					new Chunk(chunk!.x, chunk!.y, this.worldParams).region :
					this.worldParams.region;

				const result = await threadManager.emit("generate", {
					generation: this.generation,
					type: type.name,
					scope,
					resolution,
					region: {
						x: region.x,
						z: region.z,
						width: region.width,
						height: region.height
					},
					inputs
				});

				for (const output of result.outputs) {
					const OutputType = MapData.fromName(output.type);

					if (!OutputType)
						throw new Error(`Missing output map type ${output.type}!`);

					const outputId = this.createMapId(OutputType, scope, resolution, chunk);

					if (!this.mapRegistry.has(outputId))
						this.mapRegistry.set(outputId, this.getMapFromDescriptor(OutputType, output));
				}
			})();

			this.pendingPasses.set(passId, pending);
		}

		try {
			await pending;
		} finally {
			if (this.pendingPasses.get(passId) === pending)
				this.pendingPasses.delete(passId);
		}

		const map = this.mapRegistry.get(id);

		if (!map)
			throw new Error(`Pass ${pass.constructor.name} did not generate requested map ${type.name}!`);

		return map;
	}

	public async generate(type: MapDataType<any, any>, scope: GenerationScope, chunk?: Vector2Type, resolution: number = 1) {
		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		if (scope === GenerationScope.Local && !chunk)
			throw new Error("Local map generation requires chunk coordinates.");

		return this.generateMap(type, scope, chunk, resolution);
	}

	public dispose() {
		this.pendingPasses.clear();
		this.mapRegistry.clear();
		this.pendingMaps.clear();
		this.passRegistry.clear();
		this.passMapper.clear();
	}
}
