import type { Scalar } from "..";
import { Curve } from "../curve";
import { store } from "../../state";
import { param, Params } from "./parameters";
import type { WorldParams } from "./world-params";

@store
export class ElevationParams extends Params<typeof ElevationParams> {
	@param()
	public continental: Scalar;

	@param()
	public base: Curve;

	@param()
	public mountains: Scalar;

	@param()
	public mountainProfile: Curve;

	@param()
	public mountainHeight: number;

	@param()
	public hills: Scalar;

	@param()
	public hillProfile: Curve;

	@param()
	public hillHeight: number;

	@param()
	public valleys: Scalar;

	@param()
	public valleyProfile: Curve;

	@param()
	public valleyDepth: number;

	@param()
	public plateaus: Scalar;

	@param()
	public plateauProfile: Curve;

	@param()
	public plateauHeight: number;

	public constructor(continental: Scalar, base: Curve, mountains: Scalar, mountainProfile: Curve, mountainHeight: number, hills: Scalar, hillProfile: Curve, hillHeight: number, valleys: Scalar, valleyProfile: Curve, valleyDepth: number, plateaus: Scalar, plateauProfile: Curve, plateauHeight: number) {
		super();

		this.continental = continental;
		this.base = base;

		this.mountains = mountains;
		this.mountainProfile = mountainProfile;
		this.mountainHeight = mountainHeight;

		this.hills = hills;
		this.hillProfile = hillProfile;
		this.hillHeight = hillHeight;

		this.valleys = valleys;
		this.valleyProfile = valleyProfile;
		this.valleyDepth = valleyDepth;

		this.plateaus = plateaus;
		this.plateauProfile = plateauProfile;
		this.plateauHeight = plateauHeight;
	}

	public clone(world: WorldParams): ElevationParams {
		return this.new(
			this.continental.clone(world),
			this.base.clone(),

			this.mountains.clone(world),
			this.mountainProfile.clone(),
			this.mountainHeight,

			this.hills.clone(world),
			this.hillProfile.clone(),
			this.hillHeight,

			this.valleys.clone(world),
			this.valleyProfile.clone(),
			this.valleyDepth,

			this.plateaus.clone(world),
			this.plateauProfile.clone(),
			this.plateauHeight,
		);
	}
}