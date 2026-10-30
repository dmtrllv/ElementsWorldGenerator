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

@store
export class Generator {
	public readonly editor: Editor;

	public readonly worldSettings = new WorldSettings();
	public readonly biomes: BiomeRegistry;
	private readonly generatedChunks = new Set<string>();
	private currentWorld: World | null = null;
	private noise2D: NoiseFunction2D | null = null;
	private biomeSource: ProceduralBiomeSource | null = null;
	private maxTransitionWidth = 0;

	private unsubscribeViewTargetChanged: { fn: (() => void) } | null = null;

	@state
	public chunkGenerationEnabled = true;

	@state
	public chunkGenerationRadius = 2;

	public constructor(editor: Editor) {
		this.editor = editor;
		this.biomes = new BiomeRegistry(editor);
		this.unsubscribeViewTargetChanged = {
			fn: this.editor.get(Renderer).subscribeViewTargetChanged(() => {
				if (!this.currentWorld || !this.chunkGenerationEnabled)
					return;

				this.generateChunksAroundView(this.chunkGenerationRadius);
			})
		};
	}

	public dispose(): void {
		this.unsubscribeViewTargetChanged?.fn();
		this.unsubscribeViewTargetChanged = null;
	}

	public generate(){
		let {
			seed,
			size,
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

		size = size.floor();

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
		this.noise2D = createNoise2D(alea(seed));
		this.biomeSource = new ProceduralBiomeSource(seed, biomeTemperatureScale, biomeMoistureScale, biomeElevationScale, this.biomes);

		const allBiomes = this.biomes.getAll();
		this.maxTransitionWidth = Math.ceil(Math.max(0, ...allBiomes.map((biome) => biome.transitionWidth)));
		this.generateChunksAroundView(this.chunkGenerationRadius, true, true);

		this.editor.get(Renderer).render(world);
	}

	public generateChunk(chunkX: number, chunkZ: number): void {
		const world = this.currentWorld;
		const noise2D = this.noise2D;
		const biomeSource = this.biomeSource;

		if (!world || !noise2D || !biomeSource)
			throw new Error("World has not been initialized.");

		const chunk = world.getChunkAt(chunkX, chunkZ, true);

		if (!chunk)
			throw new RangeError(`Chunk coordinates (${chunkX}, ${chunkZ}) are outside the world.`);

		const key = `${chunkX},${chunkZ}`;

		if (this.generatedChunks.has(key))
			return;

		const maxTransitionWidth = this.maxTransitionWidth;
		const { seaLevel, baseHeight, continentalScale, continentalStrength, detailScale, detailStrength, roughnessScale, roughnessStrength } = this.worldSettings;

		const chunkSize = world.chunkSize;

		const originX = chunkX * chunkSize;
		const originZ = chunkZ * chunkSize;

		const endX = Math.min(originX + chunkSize, world.width);
		const endZ = Math.min(originZ + chunkSize, world.depth);

		const minX = Math.max(0, originX - maxTransitionWidth);
		const minZ = Math.max(0, originZ - maxTransitionWidth);
		const maxX = Math.min(world.width, endX + maxTransitionWidth);
		const maxZ = Math.min(world.depth, endZ + maxTransitionWidth);

		const biomeGrid: BiomeId[][] = Array.from({ length: maxX - minX }, (_, ix) => Array.from({ length: maxZ - minZ }, (_, iz) => biomeSource.getBiome(minX + ix, minZ + iz)));

		for (let x = originX; x < endX; x++) {
			for (let z = originZ; z < endZ; z++) {
				const biomeId = biomeGrid[x - minX][z - minZ];
				world.setBiome(x, z, biomeId);

				const biome = this.biomes.get(biomeId);

				if (!biome)
					throw new Error(`Unknown biome ID ${biomeId}.`);

				const biomeWeights = new Map<BiomeId, number>();

				for (let dx = -maxTransitionWidth; dx <= maxTransitionWidth; dx++) {
					for (let dz = -maxTransitionWidth; dz <= maxTransitionWidth; dz++) {
						const sampleX = x + dx;
						const sampleZ = z + dz;

						if (sampleX < minX || sampleX >= maxX || sampleZ < minZ || sampleZ >= maxZ)
							continue;

						const neighborId = biomeGrid[sampleX - minX][sampleZ - minZ];
						const neighbor = this.biomes.get(neighborId);

						if (!neighbor)
							throw new Error(`Unknown biome ID ${neighborId}.`);

						const distance = Math.sqrt(dx * dx + dz * dz);

						if (distance > neighbor.transitionWidth && distance !== 0)
							continue;

						const weight = distance === 0 ? 1 : Math.pow(1 - distance / neighbor.transitionWidth, neighbor.transitionSharpness);

						if (weight <= 0)
							continue;

						biomeWeights.set(neighborId, (biomeWeights.get(neighborId) ?? 0) + weight);
					}
				}

				let blendedHeight = 0;
				let totalWeight = 0;

				for (const [weightedBiomeId, weight] of biomeWeights) {
					const weightedBiome = this.biomes.get(weightedBiomeId);

					if (!weightedBiome)
						throw new Error(`Unknown biome ID ${weightedBiomeId}.`);

					const biomeBaseHeight = (baseHeight + weightedBiome.baseHeight) / 2;

					const biomeContinentalScale = (continentalScale + weightedBiome.continentalScale) / 2;
					const biomeDetailScale = (detailScale + weightedBiome.detailScale) / 2;
					const biomeRoughnessScale = (roughnessScale + weightedBiome.roughnessScale) / 2;

					const biomeContinentalStrength = (continentalStrength + weightedBiome.continentalStrength) / 2;
					const biomeDetailStrength = (detailStrength + weightedBiome.detailStrength) / 2;
					const biomeRoughnessStrength = (roughnessStrength + weightedBiome.roughnessStrength) / 2;

					const large = noise2D(x / biomeContinentalScale, z / biomeContinentalScale);
					const medium = noise2D(x / biomeDetailScale + 100, z / biomeDetailScale + 100);
					const fine = noise2D(x / biomeRoughnessScale + 200, z / biomeRoughnessScale + 200);

					const height = biomeBaseHeight + large * biomeContinentalStrength + medium * biomeDetailStrength + fine * biomeRoughnessStrength;

					blendedHeight += height * weight;
					totalWeight += weight;
				}

				const height = blendedHeight / totalWeight;
				const clampedHeight = Math.max(1, Math.min(world.height, Math.round(height)));

				world.setHeight(x, z, clampedHeight);

				for (let y = 0; y < clampedHeight; y++) {
					const depth = clampedHeight - 1 - y;
					const materialId = depth === 0 ? GRASS : depth <= 3 ? DIRT : ROCK;
					world.setBlock(x, y, z, materialId);
				}
			}
		}

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

			const endX = Math.min(originX + chunkSize, world.width);
			const endZ = Math.min(originZ + chunkSize, world.depth);

			for (let x = originX; x < endX; x++) {
				for (let z = originZ; z < endZ; z++) {
					if (world.getHeight(x, z) >= seaLevel)
						continue;

					const a = getVertex(x, z);
					const b = getVertex(x + 1, z);
					const c = getVertex(x + 1, z + 1);
					const d = getVertex(x, z + 1);

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

	public generateChunksAround(chunkX: number, chunkZ: number, radius: number, circular: boolean = true, force: boolean = false): void {
		if (!force && !this.chunkGenerationEnabled)
			return;

		if (!Number.isSafeInteger(radius) || radius < 0)
			throw new RangeError("Chunk radius must be a non-negative safe integer.");

		const world = this.currentWorld;

		if (!world)
			throw new Error("World has not been initialized.");

		if (circular) {
			for (let z = chunkZ - radius; z <= chunkZ + radius; z++) {
				for (let x = chunkX - radius; x <= chunkX + radius; x++) {
					const dx = x - chunkX;
					const dz = z - chunkZ;

					if (dx * dx + dz * dz > radius * radius)
						continue;

					if (!world.getChunkAt(x, z, true))
						continue;

					this.generateChunk(x, z);
				}
			}
		} else {
			for (let z = chunkZ - radius; z <= chunkZ + radius; z++) {
				for (let x = chunkX - radius; x <= chunkX + radius; x++) {
					if (!world.getChunkAt(x, z, true))
						continue;

					this.generateChunk(x, z);
				}
			}
		}
	}

	public generateChunksAroundView(radius: number, circular: boolean = true, force: boolean = false): void {
		const world = this.currentWorld;

		if (!world)
			throw new Error("World has not been initialized.");

		const target = this.editor.get(Renderer).getViewPosition();

		const chunkX = Math.floor((target.x + world.width / 2) / world.chunkSize);
		const chunkZ = Math.floor((target.z + world.depth / 2) / world.chunkSize);

		this.generateChunksAround(chunkX, chunkZ, radius, circular, force);
	}
}
