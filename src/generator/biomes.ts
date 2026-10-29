import { rgb } from "../utils";
import { DEFAULT_GENERATION_SETTINGS,type SharedGenerationSettings } from "./settings";

export type BiomeId = number;

export type BiomeGenerationSettings = SharedGenerationSettings;

export type BiomeDefinition = {
	readonly id: BiomeId;
	readonly name: string;
	readonly colorId: readonly [number, number, number];
	readonly transitionWidth: number;
	readonly transitionSharpness: number;
} & BiomeGenerationSettings;

export type BiomeOptions = BiomeGenerationSettings & {
	readonly colorId: readonly [number, number, number];
	readonly transitionWidth?: number;
	readonly transitionSharpness?: number;
};

export class BiomeRegistry {
	private readonly biomes = new Map<BiomeId, BiomeDefinition>();
	private readonly idsByName = new Map<string, BiomeId>();
	private nextId = 1;

	public register(name: string, options: BiomeOptions): BiomeId {
		if (this.idsByName.has(name))
			throw new Error(`Biome "${name}" is already registered.`);

		const id = this.nextId++;
		const biome: BiomeDefinition = {
			id,
			name,
			...DEFAULT_GENERATION_SETTINGS,
			...options,
			transitionWidth: options.transitionWidth ?? 8,
			transitionSharpness: options.transitionSharpness ?? 2,
		};

		this.validate(biome);
		this.biomes.set(id, biome);
		this.idsByName.set(name, id);

		return id;
	}

	public get(id: BiomeId): BiomeDefinition | undefined {
		return this.biomes.get(id);
	}

	public getId(name: string): BiomeId | undefined {
		return this.idsByName.get(name);
	}

	public getAll(): IterableIterator<BiomeDefinition> {
		return this.biomes.values();
	}

	private validate(biome: BiomeDefinition): void {
		if (biome.colorId.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255))
			throw new RangeError("Biome color channels must be integers between 0 and 255.");

		if (![biome.baseHeight, biome.continentalStrength, biome.detailStrength, biome.roughnessStrength].every(Number.isFinite))
			throw new RangeError("Biome height and noise strengths must be finite.");

		if (![biome.continentalScale, biome.detailScale, biome.roughnessScale].every((value) => Number.isFinite(value) && value > 0))
			throw new RangeError("Biome noise scales must be finite and greater than zero.");

		if (!Number.isFinite(biome.transitionWidth) || biome.transitionWidth < 0)
			throw new RangeError("Biome transition width must be finite and non-negative.");

		if (!Number.isFinite(biome.transitionSharpness) || biome.transitionSharpness <= 0)
			throw new RangeError("Biome transition sharpness must be finite and greater than zero.");
	}
}

export const biomes = new BiomeRegistry();

export const GRASSLAND = biomes.register("grassland", {
	colorId: rgb(126, 200, 80),
	baseHeight: 12,
	continentalScale: 86,
	continentalStrength: 4,
	detailScale: 19.2,
	detailStrength: 3,
	roughnessScale: 8,
	roughnessStrength: 1,
	transitionWidth: 8,
	transitionSharpness: 1.5
});

export const FOREST = biomes.register("forest", {
	colorId: rgb(35, 120, 55),
	baseHeight: 12,
	continentalScale: 86,
	continentalStrength: 12,
	detailScale: 19.2,
	detailStrength: 4,
	roughnessScale: 8,
	roughnessStrength: 1.5,
	transitionWidth: 10,
	transitionSharpness: 1.5
});

export const DESERT = biomes.register("desert", {
	colorId: rgb(230, 195, 110),
	baseHeight: 10,
	continentalScale: 128,
	continentalStrength: 4,
	detailScale: 32,
	detailStrength: 1.5,
	roughnessScale: 12,
	roughnessStrength: 0.5,
	transitionWidth: 12,
	transitionSharpness: 1.2
});

export const MOUNTAINS = biomes.register("mountains", {
	colorId: rgb(130, 130, 140),
	baseHeight: 18,
	continentalScale: 48,
	continentalStrength: 18,
	detailScale: 16,
	detailStrength: 6,
	roughnessScale: 6,
	roughnessStrength: 3,
	transitionWidth: 3,
	transitionSharpness: 4
});
