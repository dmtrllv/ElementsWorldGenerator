import type { WorldParams } from ".";
import { store } from "../state";
import { param, Params } from "./parameters";

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
