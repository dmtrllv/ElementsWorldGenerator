import { Vector2, Vector3 } from "three";
import { createObservable, observable } from "../reactive";
import { GeographyParams } from "./param-groups/geography/geography";
import { ParamGroup, type ParamGroupProps, type ParamGroupType } from "./param-groups/param-group";
import { TerrainParams } from "./param-groups/terrain/terrain";
import type { Immutable } from "../utils";
import { Region } from "./region";

@observable
export class WorldParams {
	public static get defaultProps(): WorldParamProps {
		return {
			size: new Vector3(512, 256, 512),
			offset: new Vector2(0, 0),
			chunkSize: 32,
			geography: GeographyParams.getDefaultProps(),
			terrain: TerrainParams.getDefaultProps()
		}
	}

	@observable
	public seed: number;

	@observable
	public size: Vector3;

	@observable
	public chunkSize: number;

	@observable
	public offset: Vector2;

	public get region() {
		return new Region(
			this.offset.x - this.size.x / 2,
			this.offset.y - this.size.z / 2,
			this.size.x,
			this.size.z
		);
	}

	public readonly geography!: GeographyParams;
	public readonly terrain!: TerrainParams;

	private readonly groupRegistry = new Map<ParamGroupType<any>, ParamGroup<any>>();

	public constructor(seed: number, { size, offset, chunkSize, geography, terrain }: WorldParamProps) {
		this.seed = seed;
		this.size = createObservable(size);
		this.offset = createObservable(offset);
		this.chunkSize = chunkSize;
		this.geography = GeographyParams.init(this, geography);
		this.terrain = TerrainParams.init(this, terrain);
	}

	public snapshot(): WorldParamsSnapshot {
		return new WorldParams(this.seed, {
			size: this.size.clone(),
			offset: this.offset.clone(),
			chunkSize: this.chunkSize,
			geography: this.geography.toProps(),
			terrain: this.terrain.toProps()
		});
	}

	public get<T extends ParamGroupType<Type>, Type extends ParamGroup<any>>(type: T): Type {
		if (this.groupRegistry.has(type))
			return this.groupRegistry.get(type)! as Type;

		const walk = (group: object): Type | undefined => {
			if (group instanceof type)
				return group;

			for (const k in group) {
				const val = group[k as keyof typeof group] as any;

				if (val && val instanceof ParamGroup) {
					const g = walk(val);

					if (g)
						return g;
				}
			}

			return undefined;
		};

		const group = walk({
			geography: this.geography,
			terrain: this.terrain
		});

		if (!group)
			throw new Error(`Could not find parameter group ${type.name}!`);

		this.groupRegistry.set(type, group);

		return group as Type;
	}
}

export type WorldParamsSnapshot = Immutable<WorldParams>;

export type WorldParamProps = {
	size: Vector3;
	offset: Vector2;
	chunkSize: number;
	geography: ParamGroupProps<GeographyParams>;
	terrain: ParamGroupProps<TerrainParams>;
}

export type SeedChangeListener = (newSeed: number) => void;
