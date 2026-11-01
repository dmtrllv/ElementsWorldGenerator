import type { WorldParams } from ".";
import { store } from "../state";
import { Params, param } from "./parameters";
import type { VectorField } from "./vectorfield";

@store
export class WindParams extends Params<typeof WindParams> {
	@param()
	public direction: VectorField;

	@param()
	public variation: number;

	public constructor(direction: VectorField, variation: number) {
		super();
		this.direction = direction;
		this.variation = variation;
	}

	public clone(world: WorldParams): WindParams {
		return this.new(
			this.direction.clone(world),
			this.variation
		);
	}
}
