
import { createNoise2D } from "simplex-noise";
import { World } from "./world";
import alea from "alea";
import { GRASS, DIRT, ROCK, WATER } from "./materials";
import { Vector3 } from "three";
import { SurfaceMesh } from "./surfaces";
import { ProceduralBiomeSource } from "./biome-source";
import { BiomeRegistry, type BiomeId } from "./biomes";
import { DEFAULT_GENERATION_SETTINGS, type GenerationSettings } from "./settings";

export class Generator {
	public generate(settings: GenerationSettings, biomes: BiomeRegistry): World {
		let {
			seed,
			size,
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
			//biomeScale,
			biomeTemperatureScale
		} = settings;

		size = size.floor();
		console.log(seaLevel, size.y)

		if (!Number.isFinite(seaLevel) || seaLevel < 0 || seaLevel > size.y)
			throw new RangeError("seaLevel must be between 0 and the world height.");

		if (!Number.isFinite(seaLevel) || seaLevel < 0 || seaLevel > size.y)
			throw new RangeError("seaLevel must be between 0 and the world height.");

		if (!Number.isFinite(baseHeight))
			throw new RangeError("baseHeight must be finite.");

		if (![continentalScale, detailScale, roughnessScale].every((value) => Number.isFinite(value) && value > 0))
			throw new RangeError("Noise scales must be finite and greater than zero.");

		if (![continentalStrength, detailStrength, roughnessStrength].every(Number.isFinite))
			throw new RangeError("Noise strengths must be finite.");

		const world = new World(seed, size, biomes);
		const prng = alea(seed);
		const noise2D = createNoise2D(prng);

		const biomeSource = new ProceduralBiomeSource(seed, biomeTemperatureScale, biomeMoistureScale, biomeElevationScale, biomes);

		const biomeGrid: BiomeId[][] = Array.from({ length: world.width }, (_, x) => Array.from({ length: world.depth }, (_, z) => biomeSource.getBiome(x, z)));
		const allBiomes = Array.from(biomes.getAll());
		const maxTransitionWidth = Math.ceil(Math.max(0, ...allBiomes.map((biome) => biome.transitionWidth)));

		for (let x = 0; x < world.width; x++) {
			for (let z = 0; z < world.depth; z++) {
				const biomeId = biomeGrid[x][z];
				world.setBiome(x, z, biomeId);
				const biome = biomes.get(biomeId);

				if (!biome)
					throw new Error(`Unknown biome ID ${biomeId}.`);

				const biomeWeights = new Map<BiomeId, number>();

				for (let dx = -maxTransitionWidth; dx <= maxTransitionWidth; dx++) {
					for (let dz = -maxTransitionWidth; dz <= maxTransitionWidth; dz++) {
						const sampleX = x + dx;
						const sampleZ = z + dz;

						if (sampleX < 0 || sampleX >= world.width || sampleZ < 0 || sampleZ >= world.depth)
							continue;

						const neighborId = biomeGrid[sampleX][sampleZ];
						const neighbor = biomes.get(neighborId);

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
					const weightedBiome = biomes.get(weightedBiomeId);

					if (!weightedBiome)
						throw new Error(`Unknown biome ID ${weightedBiomeId}.`);

					const biomeBaseHeight = baseHeight + weightedBiome.baseHeight - DEFAULT_GENERATION_SETTINGS.baseHeight;

					const biomeContinentalScale = continentalScale * weightedBiome.continentalScale / DEFAULT_GENERATION_SETTINGS.continentalScale;
					const biomeDetailScale = detailScale * weightedBiome.detailScale / DEFAULT_GENERATION_SETTINGS.detailScale;
					const biomeRoughnessScale = roughnessScale * weightedBiome.roughnessScale / DEFAULT_GENERATION_SETTINGS.roughnessScale;

					const biomeContinentalStrength = continentalStrength * weightedBiome.continentalStrength / DEFAULT_GENERATION_SETTINGS.continentalStrength;
					const biomeDetailStrength = detailStrength * weightedBiome.detailStrength / DEFAULT_GENERATION_SETTINGS.detailStrength;
					const biomeRoughnessStrength = roughnessStrength * weightedBiome.roughnessStrength / DEFAULT_GENERATION_SETTINGS.roughnessStrength;

					const large = noise2D(x / biomeContinentalScale, z / biomeContinentalScale);
					const medium = noise2D(x / biomeDetailScale + 100, z / biomeDetailScale + 100);
					const fine = noise2D(x / biomeRoughnessScale + 200, z / biomeRoughnessScale + 200);

					const height = biomeBaseHeight + large * biomeContinentalStrength + medium * biomeDetailStrength + fine * biomeRoughnessStrength;

					blendedHeight += height * weight;
					totalWeight += weight;
				}

				const height = blendedHeight / totalWeight;
				const clampedHeight = Math.max(1, Math.min(size.y, Math.round(height)));

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

			for (let x = 0; x < world.width; x++) {
				for (let z = 0; z < world.depth; z++) {
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
				world.addSurface(sea);
		}

		return world;
	}

}
