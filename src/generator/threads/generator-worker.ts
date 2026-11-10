import { MapData, type MapDataType, type TypedArray } from "../maps";
import { Pass, type PassType, isMapDependency } from "../passes";
import { GenerationContext } from "../context";
import { Region } from "../region";
import { Vector2, Vector3 } from "three";
import { WorldParams, type WorldParamProps } from "../world-params";
import type { GenerateEvent, GeneratedEvent, MapBufferDescriptor, SyncEvent } from "./manager";
import { events } from "./worker/events";

export class GeneratorWorker {
	public static readonly instance = new GeneratorWorker();

	private generation: number = -1;
	private worldParams: WorldParams | null = null;

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
		events.on("init", () => { });
		events.on("sync", this.sync);
		events.on("generate", this.generate);
	}

	private readonly sync = ({ generation, seed, worldParamsJson }: SyncEvent) => {
		if (this.generation >= generation)
			return;

		const props = JSON.parse(worldParamsJson) as WorldParamProps;

		props.size = new Vector3(props.size.x, props.size.y, props.size.z);
		props.offset = new Vector2(props.offset.x, props.offset.y);

		this.worldParams = new WorldParams(seed, props);
		this.generation = generation;

		this.passRegistry.clear();
		this.passMapper.clear();
	};

	private createMap = (type: MapDataType<any, any>, descriptor: MapBufferDescriptor) => {
		const meta = MapData.getMeta(type);
		const ArrayType = meta.type ?? Float32Array;
		const data = new ArrayType(descriptor.buffer as any) as TypedArray;

		return new type(data, descriptor.samples);
	};

	private readonly generate = ({ type, scope, resolution, region, inputs, generation }: GenerateEvent): GeneratedEvent => {
		if (!this.worldParams)
			throw new Error("Worker is not synced!");

		if (generation !== this.generation)
			throw new Error("Worker generation is out of date!");

		const MapType = MapData.fromName(type);

		if (!MapType)
			throw new Error(`Missing map type ${type}!`);

		const pass = this.getPassFromMap(MapType);
		const passMeta = Pass.getMeta().get(pass.constructor as any);

		if (!passMeta)
			throw new Error(`Missing pass metadata for ${pass.constructor.name}!`);

		for (const [key, dep] of Object.entries(passMeta.dependencies)) {
			if (isMapDependency(dep)) {
				const input = inputs[key];

				if (!input)
					throw new Error(`Missing map dependency "${key}" for ${pass.constructor.name}!`);

				const InputType = MapData.fromName(input.type);

				if (!InputType)
					throw new Error(`Missing input map type ${input.type}!`);

				Object.assign(pass, {
					[key]: this.createMap(InputType, input)
				});
			} else {
				Object.assign(pass, {
					[key]: this.worldParams.get(dep.type)
				});
			}
		}

		const outputRegion = new Region(region.x, region.z, region.width, region.height);
		const context = new GenerationContext(outputRegion, this.worldParams.region, scope, resolution);

		const outputs: MapBufferDescriptor[] = [];

		for (const [key, OutputType] of Object.entries(passMeta.outputs)) {
			const meta = MapData.getMeta(OutputType);
			const samples = meta.sampleRegion ?? context.getSampleRegion();
			const ArrayType = meta.type ?? Float32Array;
			const buffer = new SharedArrayBuffer(samples.width * samples.height * ArrayType.BYTES_PER_ELEMENT);
			const data = new ArrayType(buffer as any);
			const map = new OutputType(data, samples);

			Object.assign(pass, {
				[key]: map
			});

			outputs.push({
				type: OutputType.name,
				buffer,
				samples
			});
		}

		pass.generate(outputRegion, context);

		return { outputs };
	};
}
