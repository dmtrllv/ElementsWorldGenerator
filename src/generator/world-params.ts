import { Vector3 } from "three";
import { observable, state } from "../state";
import { GeographyParams } from "./param-groups/geography";
import type { ParamGroupProps } from "./param-groups/param-group";

@observable
export class WorldParams {
	public static get defaultProps(): WorldParamProps {
		return {
			size: new Vector3(512, 128, 512),
			geography: GeographyParams.getDefaultProps(),
		}
	}

	@state
	private _seed: number;


	public get seed() {
		return this._seed;
	}

	public set seed(seed: number) {
		this._seed = seed;
		this.seedChangeListeners.forEach(l => l(seed));
	}

	private readonly seedChangeListeners: SeedChangeListener[] = [];

	@state
	public size: Vector3;

	public readonly geography!: GeographyParams;

	public constructor(seed: number, { size, geography }: WorldParamProps) {
		this._seed = seed;
		this.size = size;
		this.geography = GeographyParams.init(this, geography);
	}

	public onSeedChange(handler: SeedChangeListener) {
		this.seedChangeListeners.push(handler);
		return () => {
			const index = this.seedChangeListeners.indexOf(handler);
			if (index > -1)
				this.seedChangeListeners.splice(index, 1);
		};
	}
}

export type WorldParamProps = {
	size: Vector3;
	geography: ParamGroupProps<GeographyParams>;
}

export type SeedChangeListener = (newSeed: number) => void;
