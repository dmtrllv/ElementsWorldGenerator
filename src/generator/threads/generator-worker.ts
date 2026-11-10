import { MapData, type MapDataType, type SampleRegion } from "../maps";
import { GenerationScope, type MapDependency, Pass, type PassType, isMapDependency } from "../passes";
import { GenerationContext } from "../context";
import { Region } from "../region";
import { Vector2, Vector3 } from "three";
import { WorldParams, type WorldParamProps } from "../world-params";
import type { GenerateEvent, GeneratedEvent, SyncEvent, InitEvent, ConfigureEvent, MapOutputDescriptor } from "./manager";
import { events } from "./worker/events";
import { WorkScheduler } from "./work-scheduler";
import { SharedArena } from "./shared-arena";
import { SharedOutputs } from "./shared-outputs";
import { TaskRegistry } from "./task-registry";
import { TaskTypes } from "./task-types";
import type { TaskKey } from "./task-registry";
import { Chunk } from "../chunk";


export class GeneratorWorker {
	public static readonly instance = new GeneratorWorker();

	private generation: number = -1;
	private worldParams: WorldParams | null = null;

	private scheduler: WorkScheduler | null = null;
	private arena: SharedArena | null = null;
	private arenas: readonly SharedArrayBuffer[] = [];
	private outputs: SharedOutputs | null = null;
	private registry: TaskRegistry | null = null;
	private readonly taskTypes = new TaskTypes();
	private workerId = -1;

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

	private resolveDependency(dep: MapDependency, region: Region) {
		const PassType = Pass.fromOutputType(dep.type);

		if (!PassType)
			throw new Error(`Could not find pass for dependency ${dep.type.name}!`);

		const scope = dep.scope ?? GenerationScope.Local;
		const resolution = typeof dep.resolution === "function" ? dep.resolution(this.worldParams!) : dep.resolution ?? 1;

		return {
			pass: this.taskTypes.getPassId(PassType),
			scope,
			resolution,
			region
		};
	}

	private createTaskKey(PassType: PassType<any>, scope: GenerationScope, resolution: number, region: Region): TaskKey {
		const worldRegion = this.worldParams!.region;

		let chunkX = 0;
		let chunkZ = 0;

		if (scope === GenerationScope.Local) {
			const chunkSize = this.worldParams!.chunkSize;

			chunkX = Math.round((region.x - worldRegion.x) / chunkSize);
			chunkZ = Math.round((region.z - worldRegion.z) / chunkSize);

			const chunk = new Chunk(chunkX, chunkZ, this.worldParams!);

			if (
				chunk.region.x !== region.x ||
				chunk.region.z !== region.z ||
				chunk.region.width !== region.width ||
				chunk.region.height !== region.height
			)
				throw new Error("Task region does not match its world chunk.");
		} else if (
			region.x !== worldRegion.x ||
			region.z !== worldRegion.z ||
			region.width !== worldRegion.width ||
			region.height !== worldRegion.height
		) {
			throw new Error("Global task region must cover the entire world.");
		}

		return {
			generation: this.generation,
			pass: this.taskTypes.getPassId(PassType),
			scope: scope === GenerationScope.Global ? 0 : 1,
			resolution,
			chunkX,
			chunkZ
		};
	}

	private getPass(PassType: PassType<any>) {
		if (!this.passRegistry.has(PassType))
			this.passRegistry.set(PassType, new PassType(this.worldParams!));

		return this.passRegistry.get(PassType)!;
	}

	private constructor() {
		events.on("init", this.init);
		events.on("configure", this.configure);
		events.on("sync", this.sync);
		events.on("generate", this.generate);
	}

	private readonly init = ({ workerId, queues, arenaCapacity }: InitEvent): SharedArrayBuffer => {
		if (this.scheduler || this.arena)
			throw new Error("Worker is already initialized!");

		this.workerId = workerId;
		this.scheduler = new WorkScheduler(workerId, [...queues]);
		this.arena = SharedArena.create(arenaCapacity);

		return this.arena.bufferRef;
	};

	private getTaskRegion(scope: GenerationScope, chunkX: number, chunkZ: number): Region {
		if (scope === GenerationScope.Global)
			return this.worldParams!.region;

		return new Chunk(chunkX, chunkZ, this.worldParams!).region;
	}

	private registerTask(PassType: PassType<any>, scope: GenerationScope, resolution: number, chunkX: number = 0, chunkZ: number = 0): number {
		if (!this.registry || !this.scheduler || !this.worldParams)
			throw new Error("Worker is not configured!");

		const region = this.getTaskRegion(scope, chunkX, chunkZ);

		const key: TaskKey = {
			generation: this.generation,
			pass: this.taskTypes.getPassId(PassType),
			scope: scope === GenerationScope.Global ? 0 : 1,
			resolution,
			chunkX: scope === GenerationScope.Local ? chunkX : 0,
			chunkZ: scope === GenerationScope.Local ? chunkZ : 0
		};

		const registration = this.registry.register(key, this.workerId);

		if (!registration.created)
			return registration.id;

		const pass = this.getPass(PassType);
		const passMeta = Pass.getMeta().get(PassType);

		if (!passMeta)
			throw new Error(`Missing pass metadata for ${PassType.name}!`);

		for (const dep of Object.values(passMeta.dependencies)) {
			if (!isMapDependency(dep))
				continue;

			const depScope = dep.scope ?? scope;
			const depResolution = dep.resolution ?? resolution;
			const resolvedResolution = typeof depResolution === "function" ?
				depResolution(this.worldParams) :
				depResolution;

			let depChunkX = 0;
			let depChunkZ = 0;

			if (depScope === GenerationScope.Local) {
				if (scope !== GenerationScope.Local)
					throw new Error(`Pass ${PassType.name} requires a local dependency without a local chunk.`);

				depChunkX = chunkX;
				depChunkZ = chunkZ;
			}

			const DependencyPass = Pass.fromOutputType(dep.type);

			if (!DependencyPass)
				throw new Error(`Could not find pass producing map ${dep.type.name}!`);

			const prerequisiteId = this.registerTask(DependencyPass, depScope, resolvedResolution, depChunkX, depChunkZ);
			const result = this.registry.addDependency(registration.id, prerequisiteId);

			if (result === "failed") {
				this.registry.fail(registration.id);
				return registration.id;
			}
		}

		if (this.registry.seal(registration.id))
			this.scheduler.enqueue(registration.id);

		return registration.id;
	}

	private readonly configure = ({ arenas, registry, outputs, taskCapacity, continuationCapacity, maxOutputs }: ConfigureEvent) => {
		if (!this.arena || !this.scheduler)
			throw new Error("Worker is not initialized!");

		if (arenas.length === 0)
			throw new Error("No worker arenas received!");

		this.arenas = arenas;
		this.registry = new TaskRegistry(registry, taskCapacity, continuationCapacity);
		this.outputs = new SharedOutputs(outputs, taskCapacity, maxOutputs);
	};

	private allocateOutput(type: MapDataType<any, any>, samples: SampleRegion) {
		if (!this.arena)
			throw new Error("Worker arena is not initialized!");

		const meta = MapData.getMeta(type);
		const ArrayType = meta.type ?? Float32Array;
		const count = samples.width * samples.height;
		const byteLength = count * ArrayType.BYTES_PER_ELEMENT;
		const offset = this.arena.allocate(byteLength, ArrayType.BYTES_PER_ELEMENT);
		const data = new ArrayType(this.arena.bufferRef as any, offset, count);

		return {
			map: new type(data, samples),
			offset,
			byteLength
		};
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

	private createMap(type: MapDataType<any, any>, descriptor: MapOutputDescriptor) {
		const meta = MapData.getMeta(type);
		const ArrayType = meta.type ?? Float32Array;
		const arena = this.arenas[descriptor.workerId] as any;

		if (!arena)
			throw new Error(`Arena for worker ${descriptor.workerId} is unavailable!`);

		const count = descriptor.samples.width * descriptor.samples.height;
		const expectedByteLength = count * ArrayType.BYTES_PER_ELEMENT;

		if (descriptor.byteLength !== expectedByteLength)
			throw new Error(`Invalid output byte length for ${type.name}`);

		const data = new ArrayType(arena, descriptor.offset, count);

		return new type(data, descriptor.samples);
	}

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

		const outputs: MapOutputDescriptor[] = [];

		for (const [key, OutputType] of Object.entries(passMeta.outputs)) {
			const meta = MapData.getMeta(OutputType);
			const samples = meta.sampleRegion ?? context.getSampleRegion();
			const { map, offset, byteLength } = this.allocateOutput(OutputType, samples);

			Object.assign(pass, {
				[key]: map
			});

			outputs.push({
				type: OutputType.name,
				workerId: this.workerId,
				offset,
				byteLength,
				samples
			});
		}

		pass.generate(outputRegion, context);

		return { outputs };
	};
}
