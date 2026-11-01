import type { Scalar } from "..";
import { store } from "../../state";
import { param, Params } from "./parameters";
import type { WorldParams } from "./world-params";

@store
export class ElevationParams extends Params<typeof ElevationParams> {
	@param()
	public readonly continental: Scalar;

	@param()
	public readonly mountains: Scalar;

	@param()
	public readonly hills: Scalar;

	@param()
	public readonly valleys: Scalar;

	@param()
	public readonly plateaus: Scalar;

	public constructor(continental: Scalar, mountains: Scalar, hills: Scalar, valleys: Scalar, plateaus: Scalar) {
		super();
		this.continental = continental;
		this.mountains = mountains;
		this.hills = hills;
		this.valleys = valleys;
		this.plateaus = plateaus;
	}

	public clone(world: WorldParams): ElevationParams {
		return this.new(
			this.continental.clone(world),
			this.mountains.clone(world),
			this.hills.clone(world),
			this.valleys.clone(world),
			this.plateaus.clone(world),
		);
	}
}
