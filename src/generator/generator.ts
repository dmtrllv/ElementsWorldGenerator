
import { createNoise2D } from "simplex-noise";
import { World } from "./world";
import alea from "alea";
import { GRASS, DIRT, ROCK, WATER } from "./materials";
import { Vector3 } from "three";
import { SurfaceMesh } from "./surfaces";
import { ProceduralBiomeSource } from "./biome-source";
import { biomes } from "./biomes";
import { DEFAULT_GENERATION_SETTINGS } from "./settings";

export class Generator {
	public generate(settings: GenerationSettings): World {
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
		} = settings;

		size = size.floor();

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

		const world = new World(seed, size);
		const prng = alea(seed);
		const noise2D = createNoise2D(prng);

		const biomeSource = new ProceduralBiomeSource(seed);

		for (let x = 0; x < world.width; x++) {
			for (let z = 0; z < world.depth; z++) {
				const biomeId = biomeSource.getBiome(x, z);
				const biome = biomes.get(biomeId);

				if (!biome)
					throw new Error(`Unknown biome ID ${biomeId}.`);

				const large = noise2D(x / biome.continentalScale, z / biome.continentalScale);
				const medium = noise2D(x / biome.detailScale + 100, z / biome.detailScale + 100);
				const fine = noise2D(x / biome.roughnessScale + 200, z / biome.roughnessScale + 200);

				const height = biome.baseHeight + large * biome.continentalStrength + medium * biome.detailStrength + fine * biome.roughnessStrength;
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

export type GenerationSettings = {
	seed: number;
	size: Vector3;
	baseHeight: number;
	seaLevel: number;
	continentalScale: number;
	continentalStrength: number;
	detailScale: number;
	detailStrength: number;
	roughnessScale: number;
	roughnessStrength: number;
};