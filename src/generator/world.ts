import { Vector3 } from "three";
import { state, store } from "../state";
import { param } from "./parameters";
import { Scalar } from "./scalar";
import { randomSeed } from "../utils";
import { Generator } from "./generator";
import { VectorField } from "./vectorfield";
import { MoistureParams } from "./moisture";
import { ElevationParams } from "./elevation";
import { LatitudeParams } from "./latitude";
import { OceanParams } from "./ocean";
import { TemperatureParams } from "./temperature";
import { WindParams } from "./wind";

@store
export class World {
	@state
	public readonly params: WorldParams;

	public readonly generator: Generator;

	public constructor(params: WorldParams) {
		this.params = params;
		this.generator = new Generator(this);
	}

	public dispose() {
		
	}
}

@store
export class WorldParams {
	public static readonly new = (
		seed?: number,
		latitude?: (world: WorldParams) => LatitudeParams,
		elevation?: (world: WorldParams) => ElevationParams,
		ocean?: (world: WorldParams) => OceanParams,
		wind?: (world: WorldParams) => WindParams,
		temperature?: (world: WorldParams) => TemperatureParams,
		moisture?: (world: WorldParams) => MoistureParams
	) => {
		const params = new WorldParams(seed);
		params.latitude = latitude && latitude(params) || new LatitudeParams(new Scalar("world.latitude", params));

		params.elevation = elevation && elevation(params) || new ElevationParams(
			new Scalar("world.elevation.continental", params),
			new Scalar("world.elevation.mountains", params),
			new Scalar("world.elevation.hills", params),
			new Scalar("world.elevation.valleys", params),
			new Scalar("world.elevation.plateaus", params),
		);

		params.ocean = ocean && ocean(params) || new OceanParams(20, 0, 1, 15, 1, 0.5);
		params.wind = wind && wind(params) || new WindParams(new VectorField("world.wind.direction", params), 0);
		params.temperature = temperature && temperature(params) || new TemperatureParams(20, 0, 1, 15);
		params.moisture = moisture && moisture(params) || new MoistureParams(0, 0, 0, 0);
		
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
