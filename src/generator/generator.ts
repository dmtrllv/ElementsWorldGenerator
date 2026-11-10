
import type { Vector2 } from "three";
import { MapData, type MapDataType } from "./maps";
import { GenerationScope, isMapDependency, Pass, type PassType } from "./passes/pass";
import type { WorldParamsSnapshot } from "./world-params";
import { GenerationContext } from "./context";
import { Chunk } from "./chunk";

export class Generator {
	public readonly worldParams: WorldParamsSnapshot;

	private readonly mapRegistry = new Map<string, MapData>();
	private readonly passRegistry = new Map<PassType<any>, Pass>();
	private readonly passMapper = new Map<MapDataType<any, any>, Pass>();

	public constructor(worldParams: WorldParamsSnapshot) {
		this.worldParams = worldParams;
	}

	private createMapId(type: MapDataType<any, any>, scope: GenerationScope, resolution: number, chunk?: Vector2): string {
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

	public generateMap(type: MapDataType<any, any>, scope: GenerationScope, chunk?: Vector2, resolution: number = 1) {
		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		if (scope === GenerationScope.Local && !chunk)
			throw new Error("Local map generation requires chunk coordinates.");

		const mapChunk = scope === GenerationScope.Local ? chunk : undefined;
		const id = this.createMapId(type, scope, resolution, mapChunk);

		if (!this.mapRegistry.has(id)) {
			const pass = this.getPassFromMap(type);
			const passMeta = Pass.getMeta().get(pass.constructor as any)!;

			for (const k in passMeta.dependencies) {
				const dep = passMeta.dependencies[k];

				if (!dep)
					throw new Error("Could not get dependency!");

				if (isMapDependency(dep)) {
					const depScope = dep.scope ?? scope;
					const depResolution = dep.resolution ?? resolution;
					const depChunk = depScope === GenerationScope.Local ? mapChunk : undefined;

					const res = typeof depResolution === "function" ? depResolution(this.worldParams) : depResolution;

					const map = this.generateMap(dep.type, depScope, depChunk, res);

					Object.assign(pass, {
						[k]: map
					});
				} else {
					Object.assign(pass, {
						[k]: this.worldParams.get(dep.type)
					});
				}
			}

			const region = mapChunk ? new Chunk(mapChunk.x, mapChunk.y, this.worldParams).region : this.worldParams.region;

			const context = new GenerationContext(region, this.worldParams.region, scope, resolution);
			const samples = context.getSampleRegion();

			for (const k in passMeta.outputs) {
				const OutputType = passMeta.outputs[k]!;

				const outputId = this.createMapId(OutputType, scope, resolution, mapChunk);

				if (!this.mapRegistry.has(outputId)) {
					const meta = MapData.getMeta(OutputType);
					const outputSamples = meta.sampleRegion ?? samples;
					const bufferSize = outputSamples.width * outputSamples.height;
					const data = new (meta.type || Float32Array)(bufferSize);
					const map = new OutputType(data, outputSamples);

					this.mapRegistry.set(outputId, map);
					Object.assign(pass, {
						[k]: map
					});
				} else {
					Object.assign(pass, {
						[k]: this.mapRegistry.get(outputId)!
					});
				}
			}

			pass.generate(region, context);
		}

		return this.mapRegistry.get(id)!;
	}

	public dispose() {
		this.mapRegistry.clear();
		this.passRegistry.clear();
		this.passMapper.clear();
	}
}
