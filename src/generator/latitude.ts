import { store } from "../state";
import { Params, param } from "./parameters";
import type { Scalar } from "./scalar";
import type { WorldParams } from "./world";

@store
export class LatitudeParams extends Params<typeof LatitudeParams> {
	@param()
	public axis: LatitudeAxis = "x";

	@param()
	public stepDistance: number = 0;

	@param()
	public offset: number = 0;

	@param()
	public readonly distortion: Scalar;

	public constructor(distortion: Scalar, axis: LatitudeAxis = "x", stepDistance: number = 0, offset: number = 0) {
		super();
		this.distortion = distortion;
		this.axis = axis;
		this.stepDistance = stepDistance;
		this.offset = offset;
	}

	public clone(world: WorldParams): LatitudeParams {
		return this.new(
			this.distortion.clone(world),
			this.axis,
			this.stepDistance,
			this.offset,
		);
	}
}

export type LatitudeAxis = "x" | "y";
