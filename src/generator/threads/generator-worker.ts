import { MapData, type MapDataType, type SampleRegion } from "../maps";
import { GenerationScope, Pass, type PassType, isMapDependency } from "../passes";
import { GenerationContext } from "../context";
import { Region } from "../region";
import { Vector2, Vector3 } from "three";
import { WorldParams, type WorldParamProps } from "../world-params";
import type { GenerateEvent, GeneratedEvent, SyncEvent, InitEvent, ConfigureEvent } from "./manager";
import { events } from "./worker/events";
import { WorkScheduler } from "./work-scheduler";
import { SharedArena } from "./shared-arena";
import { SharedOutputs, type SharedOutput } from "./shared-outputs";
import { TaskRegistry, type TaskKey } from "./task-registry";
import { TaskTypes } from "./task-types";
import { Chunk } from "../chunk";

export class GeneratorWorker {
	public static readonly instance = new GeneratorWorker();

	private generation = -1;
	private worldParams: WorldParams | null = null;

	private scheduler: WorkScheduler | null = null;
	private arena: SharedArena | null = null;
	private arenas: readonly SharedArrayBuffer[] = [];
	private outputs: SharedOutputs | null = null;
	private registry: TaskRegistry | null = null;

	private readonly taskTypes = new TaskTypes();
	private workerId = -1;
	private paused = true;
	private pumpStarted = false;

	private readonly passRegistry = new Map<PassType<any>, Pass>();

	private constructor() {
		events.on("init", this.init);
		events.on("configure", this.configure);
		events.on("pause", this.pause);
		events.on("sync", this.sync);
		events.on("generate", this.generate);
	}

	private readonly init = ({ workerId, queues, wakeup, arenaCapacity, arenaMaxCapacity }: InitEvent): SharedArrayBuffer => {
		if (this.scheduler || this.arena)
			throw new Error("Worker is already initialized!");

		this.workerId = workerId;
		this.scheduler = new WorkScheduler(workerId, [...queues], wakeup);
		this.arena = SharedArena.create(arenaCapacity, arenaMaxCapacity);

		return this.arena.bufferRef;
	};

	private readonly configure = ({ arenas, registry, outputs, taskCapacity, continuationCapacity, maxOutputs }: ConfigureEvent): void => {
		if (!this.arena || !this.scheduler)
			throw new Error("Worker is not initialized!");

		if (arenas.length === 0)
			throw new Error("No worker arenas received!");

		this.arenas = arenas;
		this.registry = new TaskRegistry(registry, taskCapacity, continuationCapacity);
		this.outputs = new SharedOutputs(outputs, taskCapacity, maxOutputs);

		if (!this.pumpStarted) {
			this.pumpStarted = true;
			void this.runScheduler();
		}
	};

	private readonly pause = (): void => {
		this.paused = true;
		this.scheduler?.wake();
	};

	private readonly sync = ({ generation, seed, worldParamsJson }: SyncEvent): void => {
		if (this.generation >= generation)
			return;

		if (!this.arena)
			throw new Error("Worker arena is not initialized!");

		const props = JSON.parse(worldParamsJson) as WorldParamProps;

		props.size = new Vector3(props.size.x, props.size.y, props.size.z);
		props.offset = new Vector2(props.offset.x, props.offset.y);

		this.worldParams = new WorldParams(seed, props);
		this.generation = generation;

		this.arena.reset();
		this.passRegistry.clear();

		this.paused = false;
		this.scheduler?.wake();
	};

	private readonly generate = async ({ generation, roots }: GenerateEvent): Promise<GeneratedEvent> => {
		if (!this.worldParams || !this.registry || !this.scheduler)
			throw new Error("Worker is not configured!");

		if (generation !== this.generation)
			throw new Error("Worker generation is out of date!");

		const taskIds: number[] = [];
		const errors: unknown[] = [];
		const ready: number[] = [];

		for (let i = 0; i < roots.length; i++) {
			if (generation !== this.generation || this.paused)
				break;

			const root = roots[i]!;

			try {
				const PassType = this.taskTypes.getPassType(root.pass);
				const scope = root.scope === 0 ? GenerationScope.Global : GenerationScope.Local;

				taskIds.push(this.registerTask(PassType, scope, root.resolution, root.chunkX, root.chunkZ, ready));
			} catch (error) {
				errors.push(error);

				try {
					const PassType = this.taskTypes.getPassType(root.pass);
					const scope = root.scope === 0 ? GenerationScope.Global : GenerationScope.Local;
					const key = this.createTaskKey(PassType, scope, root.resolution, root.chunkX, root.chunkZ);
					const taskId = this.registry.find(key);

					if (taskId !== null)
						taskIds.push(taskId);
				} catch { }
			}

			if ((i & 127) === 127) {
				this.scheduler.enqueueMany(ready);
				ready.length = 0;

				await new Promise<void>(resolve => setTimeout(resolve, 0));
			}
		}

		if (generation === this.generation && !this.paused)
			this.scheduler.enqueueMany(ready);
		else
			ready.length = 0;

		this.scheduler.enqueueMany(ready);

		const results = await Promise.allSettled(taskIds.map(id => this.registry!.waitForCompletion(id)));

		while (!this.registry.isIdle())
			await new Promise<void>(resolve => setTimeout(resolve, 0));

		for (const result of results) {
			if (result.status === "rejected")
				errors.push(result.reason);
		}

		if (errors.length > 0)
			throw new AggregateError(errors, "One or more generation tasks failed.");

		return { taskIds };
	};

	private registerTask(PassType: PassType<any>, scope: GenerationScope, resolution: number, chunkX: number = 0, chunkZ: number = 0, ready: number[]): number {
		if (!this.registry || !this.scheduler || !this.worldParams)
			throw new Error("Worker is not configured!");

		const key = this.createTaskKey(PassType, scope, resolution, chunkX, chunkZ);
		const registration = this.registry.register(key, this.workerId);

		if (!registration.created)
			return registration.id;

		try {
			const passMeta = Pass.getMeta().get(PassType);

			if (!passMeta)
				throw new Error(`Missing pass metadata for ${PassType.name}!`);

			for (const dep of Object.values(passMeta.dependencies)) {
				if (!isMapDependency(dep))
					continue;

				const depScope = dep.scope ?? scope;
				const depResolution = typeof dep.resolution === "function" ?
					dep.resolution(this.worldParams) :
					dep.resolution ?? resolution;

				if (!Number.isSafeInteger(depResolution) || depResolution < 1)
					throw new RangeError(`Invalid dependency resolution for ${dep.type.name}.`);

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

				const prerequisiteId = this.registerTask(DependencyPass, depScope, depResolution, depChunkX, depChunkZ, ready);
				const result = this.registry.addDependency(registration.id, prerequisiteId);

				if (result === "failed") {
					this.registry.fail(registration.id);
					return registration.id;
				}
			}

			if (this.registry.seal(registration.id))
				ready.push(registration.id);

			return registration.id;
		} catch (error) {
			this.registry.fail(registration.id);
			throw error;
		}
	}

	private createTaskKey(PassType: PassType<any>, scope: GenerationScope, resolution: number, chunkX: number, chunkZ: number): TaskKey {
		if (!Number.isSafeInteger(resolution) || resolution < 1)
			throw new RangeError("Resolution must be a positive safe integer.");

		if (scope === GenerationScope.Local)
			new Chunk(chunkX, chunkZ, this.worldParams!);

		return {
			generation: this.generation,
			pass: this.taskTypes.getPassId(PassType),
			scope: scope === GenerationScope.Global ? 0 : 1,
			resolution,
			chunkX: scope === GenerationScope.Local ? chunkX : 0,
			chunkZ: scope === GenerationScope.Local ? chunkZ : 0
		};
	}

	private getTaskRegion(scope: GenerationScope, chunkX: number, chunkZ: number): Region {
		if (scope === GenerationScope.Global)
			return this.worldParams!.region;

		return new Chunk(chunkX, chunkZ, this.worldParams!).region;
	}

	private getPass(PassType: PassType<any>): Pass {
		if (!this.passRegistry.has(PassType))
			this.passRegistry.set(PassType, new PassType(this.worldParams!));

		return this.passRegistry.get(PassType)!;
	}

	private createMap(type: MapDataType<any, any>, descriptor: SharedOutput) {
		const meta = MapData.getMeta(type);
		const ArrayType = meta.type ?? Float32Array;
		const arena = this.arenas[descriptor.workerId] as any;

		if (!arena)
			throw new Error(`Arena for worker ${descriptor.workerId} is unavailable!`);

		if (descriptor.mapId !== this.taskTypes.getMapId(type))
			throw new Error(`Unexpected map ID for ${type.name}.`);

		const count = descriptor.samples.width * descriptor.samples.height;
		const expectedByteLength = count * ArrayType.BYTES_PER_ELEMENT;

		if (descriptor.byteLength !== expectedByteLength)
			throw new Error(`Invalid output byte length for ${type.name}.`);

		const data = new ArrayType(arena, descriptor.offset, count);

		return new type(data, descriptor.samples);
	}

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
			descriptor: {
				mapId: this.taskTypes.getMapId(type),
				workerId: this.workerId,
				offset,
				byteLength,
				samples
			} satisfies SharedOutput
		};
	}

	private executeTask(taskId: number): void {
		if (!this.registry || !this.outputs || !this.worldParams)
			throw new Error("Worker is not configured!");

		const key = this.registry.getKey(taskId);
		const PassType = this.taskTypes.getPassType(key.pass);
		const scope = key.scope === 0 ? GenerationScope.Global : GenerationScope.Local;
		const region = this.getTaskRegion(scope, key.chunkX, key.chunkZ);
		const context = new GenerationContext(region, this.worldParams.region, scope, key.resolution);
		const pass = this.getPass(PassType);
		const passMeta = Pass.getMeta().get(PassType);

		if (!passMeta)
			throw new Error(`Missing pass metadata for ${PassType.name}.`);

		for (const [property, dependency] of Object.entries(passMeta.dependencies)) {
			if (!isMapDependency(dependency)) {
				Object.assign(pass, {
					[property]: this.worldParams.get(dependency.type)
				});

				continue;
			}

			const depScope = dependency.scope ?? scope;
			const depResolution = typeof dependency.resolution === "function" ?
				dependency.resolution(this.worldParams) :
				dependency.resolution ?? key.resolution;

			let depChunkX = 0;
			let depChunkZ = 0;

			if (depScope === GenerationScope.Local) {
				if (scope !== GenerationScope.Local)
					throw new Error(`Pass ${PassType.name} requires a local dependency without a local chunk.`);

				depChunkX = key.chunkX;
				depChunkZ = key.chunkZ;
			}

			const DependencyPass = Pass.fromOutputType(dependency.type);

			if (!DependencyPass)
				throw new Error(`No pass produces dependency map ${dependency.type.name}.`);

			const dependencyKey = this.createTaskKey(DependencyPass, depScope, depResolution, depChunkX, depChunkZ);
			const dependencyId = this.registry.find(dependencyKey);

			if (dependencyId === null)
				throw new Error(`Dependency task for ${dependency.type.name} was not registered.`);

			const outputIndex = this.taskTypes.getOutputIndex(DependencyPass, dependency.type);
			const descriptor = this.outputs.get(dependencyId, outputIndex);

			if (!descriptor)
				throw new Error(`Output for dependency ${dependency.type.name} is unavailable.`);

			Object.assign(pass, {
				[property]: this.createMap(dependency.type, descriptor)
			});
		}

		const outputs: { readonly index: number; readonly descriptor: SharedOutput }[] = [];

		for (const [index, OutputType] of this.taskTypes.getOutputs(PassType).entries()) {
			const meta = MapData.getMeta(OutputType);
			const samples = meta.sampleRegion ?? context.getSampleRegion();
			const { map, descriptor } = this.allocateOutput(OutputType, samples);

			Object.assign(pass, {
				[Object.keys(passMeta.outputs)[index]!]: map
			});

			outputs.push({ index, descriptor });
		}

		pass.generate(region, context);

		for (const output of outputs)
			this.outputs.publish(taskId, output.index, output.descriptor);
	}

	private async runScheduler(): Promise<void> {
		if (!this.scheduler || !this.registry)
			return;

		let processed = 0;

		while (true) {
			if (this.paused) {
				const sequence = this.scheduler.sequence;
				await this.scheduler.waitForChange(sequence);
				continue;
			}

			const sequence = this.scheduler.sequence;
			const taskId = this.scheduler.next();

			if (taskId === -1) {
				await this.scheduler.waitForChange(sequence);
				continue;
			}

			if (!this.registry.claim(taskId))
				continue;

			try {
				this.executeTask(taskId);

				const ready = this.registry.complete(taskId);
				this.scheduler.enqueueMany(ready);
			} catch (error) {
				console.error(`Generation task ${taskId} failed.`, error);
				this.registry.fail(taskId);
			}

			processed++;

			if (processed >= 8) {
				processed = 0;
				await new Promise<void>(resolve => setTimeout(resolve, 0));
			}
		}
	}
}
