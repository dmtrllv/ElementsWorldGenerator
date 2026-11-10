import { MapData, type MapDataType } from "../maps";
import { Pass, type PassType, isMapDependency } from "../passes";

export class TaskTypes {
	private readonly passes: readonly PassType<any>[];
	private readonly maps: readonly MapDataType<any, any>[];

	private readonly passIds: ReadonlyMap<PassType<any>, number>;
	private readonly mapIds: ReadonlyMap<MapDataType<any, any>, number>;

	public get maxOutputs(): number {
		return Math.max(1, ...this.passes.map(type => Object.keys(Pass.getMeta().get(type)?.outputs ?? {}).length));
	}

	public constructor() {
		this.passes = [...Pass.getMeta().keys()].sort((a, b) => a.name.localeCompare(b.name));
		this.maps = [...MapData.types.keys()].sort((a, b) => a.name.localeCompare(b.name));

		this.passIds = new Map(this.passes.map((type, index) => [type, index + 1]));
		this.mapIds = new Map(this.maps.map((type, index) => [type, index + 1]));

		this.validateNames(this.passes);
		this.validateNames(this.maps);
		this.validateDependencies();
	}

	public getPassId(type: PassType<any>): number {
		const id = this.passIds.get(type);

		if (id === undefined)
			throw new Error(`Unknown pass type ${type.name}.`);

		return id;
	}

	public getPassType(id: number): PassType<any> {
		const type = this.passes[id - 1];

		if (!type)
			throw new Error(`Unknown pass ID ${id}.`);

		return type;
	}

	public getMapId(type: MapDataType<any, any>): number {
		const id = this.mapIds.get(type);

		if (id === undefined)
			throw new Error(`Unknown map type ${type.name}.`);

		return id;
	}

	public getMapType(id: number): MapDataType<any, any> {
		const type = this.maps[id - 1];

		if (!type)
			throw new Error(`Unknown map ID ${id}.`);

		return type;
	}

	public getOutputs(pass: PassType<any>): readonly MapDataType<any, any>[] {
		return Object.values(Pass.getMeta().get(pass)?.outputs ?? {});
	}

	public getOutputIndex(pass: PassType<any>, map: MapDataType<any, any>): number {
		const index = this.getOutputs(pass).indexOf(map);

		if (index < 0)
			throw new Error(`Pass ${pass.name} does not produce map ${map.name}.`);

		return index;
	}

	private validateDependencies(): void {
		const visiting = new Set<PassType<any>>();
		const visited = new Set<PassType<any>>();

		const visit = (pass: PassType<any>) => {
			if (visiting.has(pass))
				throw new Error(`Pass dependency cycle detected at ${pass.name}.`);

			if (visited.has(pass))
				return;

			visiting.add(pass);

			const meta = Pass.getMeta().get(pass);

			if (!meta)
				throw new Error(`Missing pass metadata for ${pass.name}.`);

			for (const dependency of Object.values(meta.dependencies)) {
				if (!isMapDependency(dependency))
					continue;

				const dependencyPass = Pass.fromOutputType(dependency.type);

				if (!dependencyPass)
					throw new Error(`No pass produces dependency map ${dependency.type.name}.`);

				visit(dependencyPass);
			}

			visiting.delete(pass);
			visited.add(pass);
		};

		for (const pass of this.passes)
			visit(pass);
	}

	private validateNames(types: readonly { name: string }[]): void {
		const names = new Set<string>();

		for (const type of types) {
			if (names.has(type.name))
				throw new Error(`Duplicate registered type name "${type.name}".`);

			names.add(type.name);
		}
	}
}
