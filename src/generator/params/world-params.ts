import { Vector3 } from "three";
import { store } from "../../state";
import { randomSeed } from "../../utils";
import { Scalar } from "../scalar";
import { VectorField } from "../vectorfield";
import { ElevationParams } from "./elevation";
import { GeologicalParams } from "./geological";
import { LatitudeParams } from "./latitude";
import { MoistureParams } from "./moisture";
import { OceanParams } from "./ocean";
import { param } from "./parameters";
import { TemperatureParams } from "./temperature";
import { WindParams } from "./wind";
import { Curve } from "../curve";

@store
export class WorldParams {
	public static readonly new = (
		seed?: number,
		latitude?: (world: WorldParams) => LatitudeParams,
		elevation?: (world: WorldParams) => ElevationParams,
		ocean?: (world: WorldParams) => OceanParams,
		wind?: (world: WorldParams) => WindParams,
		temperature?: (world: WorldParams) => TemperatureParams,
		moisture?: (world: WorldParams) => MoistureParams,
		geological?: (world: WorldParams) => GeologicalParams,
	) => {
		const params = new WorldParams(seed);
		params.latitude = latitude && latitude(params) || new LatitudeParams(
			new Scalar("world.latitude.distortion", params, null, 0, "static", new Curve("world.latitude.distortion")), "x", 2, 0
		);
		params.elevation = elevation && elevation(params) || new ElevationParams(
			new Scalar("world.elevation.continental", params, null, 0, "procedural", new Curve("world.elevation.continental")),
			new Curve("world.elevation.base"),
			new Scalar("world.elevation.mountains", params, null, 0, "procedural", new Curve("world.elevation.mountains")),
			new Curve("world.elevation.mountain-profile"),
			0.5,
			new Scalar("world.elevation.hills", params, null, 0, "procedural", new Curve("world.elevation.hills")),
			new Curve("world.elevation.hill-profile"),
			0.15,
			new Scalar("world.elevation.valleys", params, null, 0, "procedural", new Curve("world.elevation.valleys")),
			new Curve("world.elevation.valley-profile"),
			0.15,
			new Scalar("world.elevation.plateaus", params, null, 0, "procedural", new Curve("world.elevation.plateaus")),
			new Curve("world.elevation.plateau-profile"),
			0.15,
		);

		params.ocean = ocean && ocean(params) || new OceanParams(20, 0, 1, 15, 1, 0.5);
		params.wind = wind && wind(params) || new WindParams(new VectorField("world.wind.direction", params), 0);
		params.temperature = temperature && temperature(params) || new TemperatureParams(20, 0, 1, 15);
		params.moisture = moisture && moisture(params) || new MoistureParams(0, 0, 0, 0, 0, 0, 0, 0);
		params.geological = geological && geological(params) || new GeologicalParams(0, 0, 0, 0);

		return params;
	}

	@param()
	private _seed: number;


	public get seed() {
		return this._seed;
	}

	public set seed(seed: number) {
		this._seed = seed;
	}

	private readonly seedChangeListeners: SeedChangeListener[] = [];

	@param()
	public size: Vector3 = new Vector3(512, 64, 512);

	@param()
	public chunkSize: number = 16;

	public latitude!: LatitudeParams;
	public elevation!: ElevationParams;
	public ocean!: OceanParams;
	public wind!: WindParams;
	public temperature!: TemperatureParams;
	public moisture!: MoistureParams;
	public geological!: GeologicalParams;

	private constructor(seed: number = randomSeed()) {
		this._seed = seed;
	}

	public clone(seed?: number): WorldParams {
		return WorldParams.new(
			seed !== undefined ? seed : this.seed,
			world => this.latitude.clone(world),
			world => this.elevation.clone(world),
			world => this.ocean.clone(world),
			world => this.wind.clone(world),
			world => this.temperature.clone(world),
			world => this.moisture.clone(world),
			world => this.geological.clone(world),
		);
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

export type SeedChangeListener = (newSeed: number) => void;
