import { state, store } from "../../state";
import { NumberInput } from "../../ui/components";
import { rgb } from "../../utils";
import { input, section, Settings } from "../settings";
//import { DEFAULT_GENERATION_SETTINGS, type SharedGenerationSettings } from "./settings";

export type BiomeId = number;

//export type BiomeGenerationSettings = SharedGenerationSettings;

//export type BiomeOptions = BiomeGenerationSettings & {
//	readonly color: [number, number, number];
//	readonly transitionWidth?: number;
//	readonly transitionSharpness?: number;
//	readonly constraints: BiomeConstraints;
//};

export type BiomeConstraints = {
	readonly elevation?: { ">"?: number, "<"?: number };
	readonly temperature?: { ">"?: number, "<"?: number };
	readonly moisture?: { ">"?: number, "<"?: number };
};

@store
export class BiomeRegistry {
	@state
	public readonly biomes: Biome[] = [];

	private readonly idsByName = new Map<string, BiomeId>();

	private nextId = 1;

	public constructor() {
		this.regiserDefault();
	}

	public register(options: BiomeOptions): BiomeId {
		if (this.idsByName.has(options.name))
			throw new Error(`Biome "${options.name}" is already registered.`);

		const id = this.nextId++;
		const biome = new Biome(id, options);

		this.validate(biome);
		this.biomes.push(biome);
		this.idsByName.set(options.name, id);

		return id;
	}

	public get(id: BiomeId): Biome | undefined {
		return this.biomes[id - 1];
	}

	public getId(name: string): BiomeId | undefined {
		return this.idsByName.get(name);
	}

	public getAll(): readonly Biome[] {
		return this.biomes;
	}

	private validate(biome: Biome): void {
		if (biome.color.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255))
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

	private regiserDefault() {
		this.register({
			name: "grassland",
			color: rgb(126, 200, 80),
			baseHeight: 12,
			continentalScale: 86,
			continentalStrength: 4,
			detailScale: 19.2,
			detailStrength: 3,
			roughnessScale: 8,
			roughnessStrength: 1,
			transitionWidth: 8,
			transitionSharpness: 1.5,
			constraints: {},
		});

		this.register({
			name: "forest",
			color: rgb(35, 120, 55),
			baseHeight: 12,
			continentalScale: 86,
			continentalStrength: 12,
			detailScale: 19.2,
			detailStrength: 4,
			roughnessScale: 8,
			roughnessStrength: 1.5,
			transitionWidth: 10,
			transitionSharpness: 1.5,
			constraints: {
				moisture: { ">": 0.1 },
			},
		});

		this.register({
			name: "desert",
			color: rgb(230, 195, 110),
			baseHeight: 10,
			continentalScale: 128,
			continentalStrength: 4,
			detailScale: 32,
			detailStrength: 1.5,
			roughnessScale: 12,
			roughnessStrength: 0.5,
			transitionWidth: 12,
			transitionSharpness: 1.2,
			constraints: {
				temperature: { ">": 0.25 },
				moisture: { "<": -0.15 },
			},
		});

		this.register({
			name: "mountains",
			color: rgb(130, 130, 140),
			baseHeight: 18,
			continentalScale: 48,
			continentalStrength: 18,
			detailScale: 16,
			detailStrength: 6,
			roughnessScale: 6,
			roughnessStrength: 3,
			transitionWidth: 3,
			transitionSharpness: 4,
			constraints: {
				elevation: { ">": 0.55 },
			},
		});
	}
}

export type BiomeOptions = Omit<Biome, "id" | "name" | "color"> & {
	name: string;
	color: [number, number, number];
};

@store
export class Biome extends Settings {
	public readonly id!: BiomeId;

	//@input(NumberInput)
	public name!: string;

	//@input(NumberInput)
	public color!: [number, number, number];

	@input(NumberInput)
	public baseHeight: number = 12;

	@input(NumberInput)
	public continentalScale: number = 96;

	@input(NumberInput)
	public continentalStrength: number = 12;

	@input(NumberInput)
	public detailScale: number = 87 / 2.5;

	@input(NumberInput)
	public detailStrength: number = 4;

	@input(NumberInput)
	public roughnessScale: number = 87 / 2;

	@input(NumberInput)
	public roughnessStrength: number = 1.2;

	@section("Transition")
	@input(NumberInput)
	public transitionWidth: number = 8;

	@input(NumberInput)
	public transitionSharpness: number = 1.5;

	//@input(NumberInput)
	public constraints: BiomeConstraints = {};

	public constructor(id: BiomeId, options: BiomeOptions) {
		super();
		Object.assign(this, { id, ...options });
	}
}