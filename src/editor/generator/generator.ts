import { Vector3 } from "three";
import type { Editor } from "../editor";
import { store, state } from "../../state";
import { BiomeRegistry, type BiomeId } from "./biomes";
import { World } from "./world";
import alea from "alea";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { ProceduralBiomeSource } from "./biome-source";
import { GRASS, DIRT, ROCK, WATER } from "./materials";
import { SurfaceMesh } from "./surfaces";
import { Renderer } from "../renderer";
import { WorldSettings } from "./world-settings";
import { ThreadManager } from "../thread-manager";

@store
export class Generator {
	public readonly editor: Editor;

	public readonly worldSettings = new WorldSettings();
	public readonly biomes: BiomeRegistry;
	private readonly generatedChunks = new Set<string>();
	private currentWorld: World | null = null;
	//private noise2D: NoiseFunction2D | null = null;
	//private biomeSource: ProceduralBiomeSource | null = null;
	//private maxTransitionWidth = 0;
	private readonly generatingChunks = new WeakMap<World, Map<string, Promise<void>>>();

	private unsubscribeViewTargetChanged: { fn: (() => void) } | null = null;

	@state
	public chunkGenerationEnabled = true;

	@state
	public chunkGenerationRadius = 2;

	private readonly threadManager: ThreadManager;

	public constructor(editor: Editor) {
		this.editor = editor;
		this.threadManager = editor.get(ThreadManager);
		this.biomes = new BiomeRegistry(editor);
		this.unsubscribeViewTargetChanged = {
			fn: this.editor.get(Renderer).subscribeViewTargetChanged(() => {
				if (!this.currentWorld || !this.chunkGenerationEnabled)
					return;

				void this.generateChunksAroundView(this.chunkGenerationRadius);
			})
		};
	}

	public dispose(): void {
		this.unsubscribeViewTargetChanged?.fn();
		this.unsubscribeViewTargetChanged = null;
	}

	public async generate() {
		const {
			seed,
			size: configuredSize,
			chunkSize,
			baseHeight,
			seaLevel,
			continentalScale,
			continentalStrength,
			detailScale,
			detailStrength,
			roughnessScale,
			roughnessStrength,
			biomeElevationScale,
			biomeMoistureScale,
			biomeTemperatureScale
		} = this.worldSettings;

		const size = configuredSize.clone().floor();

		await this.threadManager.sync(this.worldSettings, this.biomes);

		if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0)
			throw new RangeError("Chunk size must be a positive safe integer.");

		if (!Number.isFinite(seaLevel) || seaLevel < 0 || seaLevel > size.y)
			throw new RangeError("seaLevel must be between 0 and the world height.");

		if (!Number.isFinite(baseHeight))
			throw new RangeError("baseHeight must be finite.");

		if (![continentalScale, detailScale, roughnessScale].every((value) => Number.isFinite(value) && value > 0))
			throw new RangeError("Noise scales must be finite and greater than zero.");

		if (![continentalStrength, detailStrength, roughnessStrength].every(Number.isFinite))
			throw new RangeError("Noise strengths must be finite.");

		const world = new World(seed, size, this.biomes, chunkSize);
		this.generatedChunks.clear();
		this.currentWorld = world;
		//this.noise2D = createNoise2D(alea(seed));
		//this.biomeSource = new ProceduralBiomeSource(seed, biomeTemperatureScale, biomeMoistureScale, biomeElevationScale, this.biomes.getAll());

		const allBiomes = this.biomes.getAll();
		//this.maxTransitionWidth = Math.ceil(Math.max(0, ...allBiomes.map((biome) => biome.transitionWidth)));
		await this.generateChunksAroundView(this.chunkGenerationRadius, true, true);

		this.editor.get(Renderer).render(world);
	}

	public generateChunk(chunkX: number, chunkZ: number): Promise<void> {
		const world = this.currentWorld;

		if (!world)
			throw new Error("World has not been initialized.");

		const key = `${chunkX},${chunkZ}`;

		let pending = this.generatingChunks.get(world);

		if (!pending) {
			pending = new Map();
			this.generatingChunks.set(world, pending);
		}

		const existing = pending.get(key);

		if (existing)
			return existing;

		if (this.generatedChunks.has(key))
			return Promise.resolve();

		const generation = this.generateChunkInternal(world, chunkX, chunkZ).finally(() => {
			if (pending!.get(key) === generation)
				pending!.delete(key);
		});

		pending.set(key, generation);

		return generation;
	}

	private async generateChunkInternal(world: World, chunkX: number, chunkZ: number): Promise<void> {

		const chunk = world.getChunkAt(chunkX, chunkZ, true);

		if (!chunk)
			throw new RangeError(`Chunk coordinates (${chunkX}, ${chunkZ}) are outside the world.`);

		const key = `${chunkX},${chunkZ}`;

		if (this.generatedChunks.has(key))
			return;

		const { seaLevel } = this.worldSettings;
		const result = await this.threadManager.generateChunk(chunkX, chunkZ);

		// The world may have been replaced while the worker was generating.
		if (this.currentWorld !== world)
			return;

		world.applyChunkGenerationResult(result);


		if (seaLevel > 0) {
			const sea = new SurfaceMesh(WATER);
			const vertexIndices = new Map<string, number>();

			const getVertex = (x: number, z: number): number => {
				const key = `${x},${z}`;
				const existing = vertexIndices.get(key);

				if (existing !== undefined)
					return existing;

				const index = sea.addVertex(new Vector3(x - world.width / 2, seaLevel, z - world.depth / 2), [x / world.width, z / world.depth]);
				vertexIndices.set(key, index);

				return index;
			};

			for (let x = 0; x < chunk.width; x++) {
				for (let z = 0; z < chunk.depth; z++) {
					const worldX = chunk.originX + x;
					const worldZ = chunk.originZ + z;

					if (world.getHeight(worldX, worldZ) >= seaLevel)
						continue;

					const a = getVertex(worldX, worldZ);
					const b = getVertex(worldX + 1, worldZ);
					const c = getVertex(worldX + 1, worldZ + 1);
					const d = getVertex(worldX, worldZ + 1);

					sea.addTriangle(a, c, b);
					sea.addTriangle(a, d, c);
				}
			}

			if (sea.triangles.length > 0)
				world.addSurface(chunkX, chunkZ, sea);
		}

		const renderer = this.editor.get(Renderer);

		renderer.renderChunk(world, chunkX, chunkZ);
		renderer.renderChunk(world, chunkX - 1, chunkZ);
		renderer.renderChunk(world, chunkX + 1, chunkZ);
		renderer.renderChunk(world, chunkX, chunkZ - 1);
		renderer.renderChunk(world, chunkX, chunkZ + 1);

		this.generatedChunks.add(key);
	}

	public async generateChunksAround(chunkX: number, chunkZ: number, radius: number, circular: boolean = true, force: boolean = false): Promise<void> {
		if (!force && !this.chunkGenerationEnabled)
			return;

		if (!Number.isSafeInteger(radius) || radius < 0)
			throw new RangeError("Chunk radius must be a non-negative safe integer.");

		const world = this.currentWorld;

		if (!world)
			throw new Error("World has not been initialized.");

		const tasks: Promise<void>[] = [];

		for (let z = chunkZ - radius; z <= chunkZ + radius; z++) {
			for (let x = chunkX - radius; x <= chunkX + radius; x++) {
				const dx = x - chunkX;
				const dz = z - chunkZ;

				if (circular && dx * dx + dz * dz > radius * radius)
					continue;

				if (!world.getChunkAt(x, z, true))
					continue;

				tasks.push(this.generateChunk(x, z));
			}
		}

		await Promise.all(tasks);
	}

	public async generateChunksAroundView(radius: number, circular: boolean = true, force: boolean = false): Promise<void> {
		const world = this.currentWorld;

		if (!world)
			throw new Error("World has not been initialized.");

		const target = this.editor.get(Renderer).getViewPosition();

		const chunkX = Math.floor((target.x + world.width / 2) / world.chunkSize);
		const chunkZ = Math.floor((target.z + world.depth / 2) / world.chunkSize);

		await this.generateChunksAround(chunkX, chunkZ, radius, circular, force);
	}
}
