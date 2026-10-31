import { state, store } from "../../state";
import { rgb } from "../../utils";
import { Editor } from "../editor";
import { NotificationManager } from "../notifications";
import { serializable } from "../serializer";
import { input, section, Settings } from "../settings";

export type BiomeId = number;

export type BiomeConstraints = {
	elevation?: { ">"?: number, "<"?: number };
	temperature?: { ">"?: number, "<"?: number };
	moisture?: { ">"?: number, "<"?: number };
};

@store
export class BiomeRegistry {
	@state
	public biomes: Biome[] = [];
	private readonly idsByName = new Map<string, BiomeId>();
	private readonly notifications: NotificationManager;
	private idCounter = 0;
	private freeIds: number[] = [];

	private nextId() {
		let id = this.freeIds.pop();
		if (id !== undefined)
			return id;
		return this.idCounter++;
	}

	public constructor(editor: Editor) {
		this.notifications = editor.get(NotificationManager);
		this.regiserDefault();
	}

	public register(options: BiomeOptions): BiomeId {
		if (this.idsByName.has(options.name))
			throw this.notifications.error(`Biome "${options.name}" is already registered.`);

		const id = this.nextId();
		const biome = new Biome(id, options);

		this.validate(biome);
		this.biomes.push(biome);
		this.idsByName.set(options.name, id);

		return id;
	}

	public remove(name: string) {
		if (!this.idsByName.has(name))
			throw this.notifications.error(`Biome "${name}" is not registered.`);
		const index = this.biomes.findIndex(b => b.name === name);
		if (index > -1) {
			delete this.biomes[index];
			this.freeIds.push(index);
		}
		this.idsByName.delete(name);
	}

	public load(biomes: Biome[]): void {
		let highestId = 0;
		let last = this.biomes.pop();

		while (last) {
			this.remove(last.name);
			last = this.biomes.pop();
		}

		biomes.forEach(biome => {
			this.biomes.push(biome);
			this.idsByName.set(biome.name, biome.id);

			if (biome.id > highestId)
				highestId = biome.id;
		});

		this.idCounter = highestId + 1;
		this.freeIds = [];
	}

	public get(id: BiomeId): Biome | undefined {
		return this.biomes[id];
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
				elevation: { ">": 0.1 },
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
	@serializable()
	public readonly id: BiomeId = 0;

	@input("text")
	@serializable()
	public name: string = "";

	@input("color")
	@serializable()
	public color: [number, number, number] = [0, 0, 0];

	@input("number")
	@serializable()
	public baseHeight: number = 12;

	@input("number")
	@serializable()
	public continentalScale: number = 96;

	@input("number")
	@serializable()
	public continentalStrength: number = 12;

	@input("number")
	@serializable()
	public detailScale: number = 87 / 2.5;

	@input("number")
	@serializable()
	public detailStrength: number = 4;

	@input("number")
	@serializable()
	public roughnessScale: number = 87 / 2;

	@input("number")
	@serializable()
	public roughnessStrength: number = 1.2;

	@section("Transition")
	@input("number")
	@serializable()
	public transitionWidth: number = 8;

	@input("number")
	@serializable()
	public transitionSharpness: number = 1.5;

	//@input("number")
	@serializable()
	public constraints: BiomeConstraints = {};

	public constructor(id?: BiomeId, options?: BiomeOptions) {
		super();
		if (id !== undefined)
			Object.assign(this, { id, ...options });
	}
}