import { param, Params, WorldParams } from ".";
import { store } from "../state";

@store
export class MoistureParams extends Params<typeof MoistureParams> {
	@param()
	public humidityBase: number;
	
	@param()
	public humidityStrength: number;

	@param()
	public evaporationStrength: number;

	@param()
	public precipitationEfficiency: number;

	public constructor(humidityBase: number, humidityStrength: number, evaporationStrength: number, precipitationEfficiency: number) {
		super();
		this.humidityBase = humidityBase;
		this.humidityStrength = humidityStrength;
		this.evaporationStrength = evaporationStrength;
		this.precipitationEfficiency = precipitationEfficiency;
	}

	public clone(_: WorldParams): MoistureParams {
		return this.new(
			this.humidityBase,
			this.humidityStrength,
			this.evaporationStrength,
			this.precipitationEfficiency,
		);
	}
}