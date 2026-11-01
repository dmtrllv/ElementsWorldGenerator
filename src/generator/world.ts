import { Vector3 } from "three";
import { state, store } from "../state";
import { param } from "./parameters";
import { Scalar } from "./scalar";
import { randomSeed } from "../utils";

@store
export class World {
	@state
	public readonly params: WorldParams;

	public constructor(params: WorldParams) {
		this.params = params;
	}
}

interface Params<T> {
	clone(world: WorldParams): T;
}

@store
export class WorldParams {
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

	public latitude: LatitudeParams;
	public elevation: ElevationParams;
	public ocean: OceanParams;
	public wind: WindParams;
	public temperature: TemperatureParams;
	public moisture: MoistureParams;

	public constructor(
		seed: number = randomSeed(), 
		latitude?: (world: WorldParams) => LatitudeParams, 
		elevation?: (world: WorldParams) => ElevationParams, 
		ocean?: (world: WorldParams) => OceanParams,
		wind?: (world: WorldParams) => WindParams,
		temperature?: (world: WorldParams) => TemperatureParams,
		moisture?: (world: WorldParams) => MoistureParams,
	) {
		this._seed = seed;
		
		this.latitude = latitude && latitude(this) || new LatitudeParams(new Scalar("world.latitude", this));

		this.elevation = elevation && elevation(this) || new ElevationParams(
			new Scalar("world.elevation.continental", this),
			new Scalar("world.elevation.mountains", this),
			new Scalar("world.elevation.hills", this),
			new Scalar("world.elevation.valleys", this),
			new Scalar("world.elevation.plateaus", this),
		);

		this.ocean = ocean && ocean(this) || new OceanParams(20, 0, 1, 15, 1, 0.5);
		this.wind = wind && wind(this) || new WindParams(new Scalar("world.wind.direction", this), 0);
		this.temperature = temperature && temperature(this) || new TemperatureParams(20, 0, 1, 15);
		this.moisture = moisture && moisture(this) || new MoistureParams(0, 0, 0);
	}

	public clone(seed?: number): WorldParams {
		return new WorldParams(
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
export class LatitudeParams implements Params<LatitudeParams> {
	@param()
	public axis: LatitudeAxis = "x";

	@param()
	public stepDistance: number = 0;

	@param()
	public offset: number = 0;

	@param()
	public readonly distortion: Scalar;

	public constructor(distortion: Scalar, axis: LatitudeAxis = "x", stepDistance: number = 0, offset: number = 0) {
		this.distortion = distortion;
		this.axis = axis;
		this.stepDistance = stepDistance;
		this.offset = offset;
	}

	public clone(world: WorldParams): LatitudeParams {
		return new LatitudeParams(
			this.distortion.clone(world),
			this.axis,
			this.stepDistance,
			this.offset
		);
	}
}

export type LatitudeAxis = "x" | "y";

@store
export class ElevationParams implements Params<ElevationParams> {
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
		this.continental = continental;
		this.mountains = mountains;
		this.hills = hills;
		this.valleys = valleys;
		this.plateaus = plateaus;
	}

	public clone(world: WorldParams): ElevationParams {
		return new ElevationParams(
			this.continental.clone(world),
			this.mountains.clone(world),
			this.hills.clone(world),
			this.valleys.clone(world),
			this.plateaus.clone(world),
		);
	}
}

@store
export class OceanParams implements Params<OceanParams> {
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
		this.seaLevel = seaLevel;
		this.seaLevelVariation = seaLevelVariation;
		this.scale = scale;
		this.depth = depth;
		this.coastFalloff = coastFalloff;
		this.coverage = coverage;
	}

	public clone(_: WorldParams): OceanParams {
		return new OceanParams(
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
export class WindParams implements Params<WindParams> {
	@param()
	public direction: Scalar;

	@param()
	public variation: number;

	public constructor(direction: Scalar, variation: number) {
		this.direction = direction;
		this.variation = variation;
	}

	public clone(world: WorldParams): WindParams {
		return new WindParams(
			this.direction.clone(world),
			this.variation
		);
	}
}

@store
export class TemperatureParams implements Params<TemperatureParams> {
	@param()
	public equatorTemperature: number;

	@param()
	public poleTemperature: number;

	@param()
	public falloff: number;

	@param()
	public elevationCooling: number;

	public constructor(equatorTemperature: number, poleTemperature: number, falloff: number, elevationCooling: number) {
		this.equatorTemperature = equatorTemperature;
		this.poleTemperature = poleTemperature;
		this.falloff = falloff;
		this.elevationCooling = elevationCooling;
	}

	public clone(_: WorldParams): TemperatureParams {
		return new TemperatureParams(
			this.equatorTemperature,
			this.poleTemperature,
			this.falloff,
			this.elevationCooling
		);
	}
}

@store
export class MoistureParams implements Params<MoistureParams> {
	@param()
	public humidity: number;

	@param()
	public evaporationStrength: number;

	@param()
	public precipitationEfficiency: number;

	public constructor(humidity: number, evaporationStrength: number, precipitationEfficiency: number) {
		this.humidity = humidity;
		this.evaporationStrength = evaporationStrength;
		this.precipitationEfficiency = precipitationEfficiency;
	}

	public clone(_: WorldParams): MoistureParams {
		return new MoistureParams(
			this.humidity,
			this.evaporationStrength,
			this.precipitationEfficiency,
		);
	}
}