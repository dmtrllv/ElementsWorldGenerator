import { Vector3 } from "three";
import { state, Store, store } from "../state";
import { param } from "./parameters";
import { Scalar } from "./scalar";
import { randomSeed } from "../utils";
import { Generator } from "./generator";

@store
export class World {
	@state
	public readonly params: WorldParams;

	public readonly generator: Generator;

	public constructor(params: WorldParams) {
		this.params = params;
		this.generator = new Generator(this);
	}
}

abstract class Params<T extends new (...args: any[]) => Params<any>> extends Store<T> {
	abstract clone(world: WorldParams): InstanceType<T>;
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
		params.wind = wind && wind(params) || new WindParams(new Scalar("world.wind.direction", params), 0);
		params.temperature = temperature && temperature(params) || new TemperatureParams(20, 0, 1, 15);
		params.moisture = moisture && moisture(params) || new MoistureParams(0, 0, 0);
		
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

@store
export class OceanParams extends Params<typeof OceanParams> {
	@param()
	public seaLevel: number;

	@param()
	public seaLevelVariation: number;

	@param()
	public scale: number;

	@param()
	public depth: number;

	@param()
	public coastFalloff: number;

	@param()
	public coverage: number;

	public constructor(seaLevel: number, seaLevelVariation: number, scale: number, depth: number, coastFalloff: number, coverage: number) {
		super();
		this.seaLevel = seaLevel;
		this.seaLevelVariation = seaLevelVariation;
		this.scale = scale;
		this.depth = depth;
		this.coastFalloff = coastFalloff;
		this.coverage = coverage;
	}

	public clone(_: WorldParams): OceanParams {
		return this.new(
			this.seaLevel,
			this.seaLevelVariation,
			this.scale,
			this.depth,
			this.coastFalloff,
			this.coverage
		);
	}
}

@store
export class WindParams extends Params<typeof WindParams> {
	@param()
	public direction: Scalar;

	@param()
	public variation: number;

	public constructor(direction: Scalar, variation: number) {
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

@store
export class TemperatureParams extends Params<typeof TemperatureParams> {
	@param()
	public equatorTemperature: number;

	@param()
	public poleTemperature: number;

	@param()
	public falloff: number;

	@param()
	public elevationCooling: number;

	public constructor(equatorTemperature: number, poleTemperature: number, falloff: number, elevationCooling: number) {
		super();
		this.equatorTemperature = equatorTemperature;
		this.poleTemperature = poleTemperature;
		this.falloff = falloff;
		this.elevationCooling = elevationCooling;
	}

	public clone(_: WorldParams): TemperatureParams {
		return this.new(
			this.equatorTemperature,
			this.poleTemperature,
			this.falloff,
			this.elevationCooling
		);
	}
}

@store
export class MoistureParams extends Params<typeof MoistureParams> {
	@param()
	public humidity: number;

	@param()
	public evaporationStrength: number;

	@param()
	public precipitationEfficiency: number;

	public constructor(humidity: number, evaporationStrength: number, precipitationEfficiency: number) {
		super();
		this.humidity = humidity;
		this.evaporationStrength = evaporationStrength;
		this.precipitationEfficiency = precipitationEfficiency;
	}

	public clone(_: WorldParams): MoistureParams {
		return this.new(
			this.humidity,
			this.evaporationStrength,
			this.precipitationEfficiency,
		);
	}
}