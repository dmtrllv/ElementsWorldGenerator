import type { Vector2 } from "three";
import { MapData, type MapDataType } from "./maps";
import { GenerationScope, isMapDependency, Pass, type PassType } from "./passes/pass";
import type { WorldParamsSnapshot } from "./world-params";
import { Region } from "./region";

export class Generator {
	public readonly worldParams: WorldParamsSnapshot;

	private readonly worldArea: number;
	private readonly chunkArea: number;

	private readonly mapRegistry = new Map<string, MapData>();
	private readonly passRegistry = new Map<PassType<any>, Pass>();
	private readonly passMapper = new Map<MapDataType<any>, Pass>();

	public constructor(worldParams: WorldParamsSnapshot) {
		this.worldParams = worldParams;
		this.worldArea = this.worldParams.size.x * this.worldParams.size.z;
		this.chunkArea = this.worldParams.chunkSize.x * this.worldParams.chunkSize.y;
	}

	private getPassFromMap(type: MapDataType<any>) {
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

	public generateMap(type: MapDataType<any>, scope: GenerationScope, chunk?: Vector2) {
		const createId = (type: MapDataType<any>) => {
			let id = `${type.name}:${scope}`;
			if (chunk) {
				id += `:${chunk.x}:${chunk.y}`;
			}
			return id;
		}

		const id = createId(type);

		if (!this.mapRegistry.has(id)) {
			const pass = this.getPassFromMap(type);
			const passMeta = Pass.getMeta().get(pass.constructor as any)!;

			for (const k in passMeta.dependencies) {
				const dep = passMeta.dependencies[k];
				if (!dep)
					throw new Error("Could not get dependency!");

				if (isMapDependency(dep)) {
					const depScope = dep.scope || scope;
					const map = this.generateMap(dep.type, depScope, chunk);
					Object.assign(pass, {
						[k]: map
					});
				} else {
					Object.assign(pass, {
						[k]: this.worldParams.get(dep.type)
					})
				}
			}

			const bufferSize = scope === GenerationScope.Global ? this.worldArea : this.chunkArea;

			for (const k in passMeta.outputs) {
				const OutputType = passMeta.outputs[k]!;
				const meta = MapData.getMeta(OutputType);
				const data = new (meta.type || Float32Array)(bufferSize);
				const map = new OutputType(data);
				Object.assign(pass, {
					[k]: map
				});
				this.mapRegistry.set(createId(OutputType), map);
			}

			const region = chunk ? new Region(
				chunk.x * this.worldParams.chunkSize.x - this.worldParams.size.x / 2,
				chunk.y * this.worldParams.chunkSize.y - this.worldParams.size.z / 2,
				this.worldParams.chunkSize.x,
				this.worldParams.chunkSize.y
			) : this.worldParams.region;

			pass.generate(region, scope);
		}

		return this.mapRegistry.get(id)!;
	}

	public dispose() {

	}
}