
export type MaterialId = number;

export type RenderGroup = string;

export type MaterialDefinition = {
	readonly id: MaterialId;
	readonly name: string;
	readonly paletteIndex: number;
	readonly renderGroup: RenderGroup;
};

export type MaterialOptions = Partial<Pick<MaterialDefinition, "paletteIndex" | "renderGroup">>;

type MaterialListener = (material: MaterialDefinition) => void;

export class MaterialRegistry {
	private readonly materials = new Map<MaterialId, MaterialDefinition>();
	private readonly idsByName = new Map<string, MaterialId>();
	private readonly listeners = new Set<MaterialListener>();
	private nextId = 1;

	public register(name: string, options: MaterialOptions = {}): MaterialId {
		if (this.idsByName.has(name))
			throw new Error(`Material "${name}" is already registered.`);

		if (this.nextId > 0xFFFFFFFF)
			throw new RangeError("Material ID limit reached.");

		const id = this.nextId++;
		const definition: MaterialDefinition = {
			id,
			name,
			paletteIndex: options.paletteIndex ?? id - 1,
			renderGroup: options.renderGroup ?? "opaque"
		};

		this.validate(definition);
		this.materials.set(id, definition);
		this.idsByName.set(name, id);
		this.notify(definition);

		return id;
	}

	public get(id: MaterialId): MaterialDefinition | undefined {
		return this.materials.get(id);
	}

	public getId(name: string): MaterialId | undefined {
		return this.idsByName.get(name);
	}

	public getAll(): IterableIterator<MaterialDefinition> {
		return this.materials.values();
	}

	public update(id: MaterialId, changes: MaterialOptions): void {
		const current = this.materials.get(id);
		if (!current)
			throw new Error(`Material with ID ${id} does not exist.`);

		const updated: MaterialDefinition = { ...current, ...changes, id: current.id, name: current.name };
		this.validate(updated);
		this.materials.set(id, updated);
		this.notify(updated);
	}

	public subscribe(listener: MaterialListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private validate(material: MaterialDefinition): void {
		if (!Number.isSafeInteger(material.paletteIndex) || material.paletteIndex < 0)
			throw new RangeError("paletteIndex must be a non-negative integer.");

		if (!material.renderGroup.trim())
			throw new Error("renderGroup cannot be empty.");
	}

	private notify(material: MaterialDefinition): void {
		for (const listener of this.listeners)
			listener(material);
	}
}

export const materials = new MaterialRegistry();

export const GRASS = materials.register("grass", { paletteIndex: 0 });
export const DIRT = materials.register("dirt", { paletteIndex: 1 });
export const SAND = materials.register("sand", { paletteIndex: 2 });
export const ROCK = materials.register("rock", { paletteIndex: 3 });
export const WATER = materials.register("water", { paletteIndex: 4, renderGroup: "transparent" });
