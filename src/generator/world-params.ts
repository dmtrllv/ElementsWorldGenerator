import { Vector3 } from "three";
import { observable,} from "../reactive";
import { GeographyParams } from "./param-groups/geography/geography";
import type { ParamGroupProps } from "./param-groups/param-group";
import { TerrainParams } from "./param-groups/terrain/terrain";

@observable
export class WorldParams {
	public static get defaultProps(): WorldParamProps {
		return {
			size: new Vector3(512, 128, 512),
			geography: GeographyParams.getDefaultProps(),
			terrain: TerrainParams.getDefaultProps()
		}
	}

	@observable
	public seed: number;

	@observable
	public size: Vector3;

	public readonly geography!: GeographyParams;
	public readonly terrain!: TerrainParams;

	public constructor(seed: number, { size, geography, terrain }: WorldParamProps) {
		this.seed = seed;
		this.size = size;
		this.geography = GeographyParams.init(this, geography);
		this.terrain = TerrainParams.init(this, terrain);
	}
}

export type WorldParamProps = {
	size: Vector3;
	geography: ParamGroupProps<GeographyParams>;
	terrain: ParamGroupProps<TerrainParams>;
}

export type SeedChangeListener = (newSeed: number) => void;
