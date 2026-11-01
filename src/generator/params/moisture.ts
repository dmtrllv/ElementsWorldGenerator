import { store } from "../../state";
import { param, Params } from "./parameters";
import type { WorldParams } from "./world-params";

@store
export class MoistureParams extends Params<typeof MoistureParams> {
	@param()
	public humidityBase: number;

	@param()
	public humidityStrength: number;

	@param()
	public evaporationStrength: number;

	@param()
	public infiltration: number;

	@param()
	public precipitationEfficiency: number;
	
	@param()
	public groundWater: number;
	
	@param()
	public runoff: number;
	
	@param()
	public waterRetention: number;

	public constructor(humidityBase: number, humidityStrength: number, evaporationStrength: number, infiltration: number, precipitationEfficiency: number, groundWater: number, runoff: number, waterRetention: number) {
		super();
		this.humidityBase = humidityBase;
		this.humidityStrength = humidityStrength;
		this.evaporationStrength = evaporationStrength;
		this.infiltration = infiltration;
		this.precipitationEfficiency = precipitationEfficiency;
		this.groundWater = groundWater;
		this.runoff = runoff;
		this.waterRetention = waterRetention;
	}

	public clone(_: WorldParams): MoistureParams {
		return this.new(
			this.humidityBase,
			this.humidityStrength,
			this.evaporationStrength,
			this.infiltration,
			this.precipitationEfficiency,
			this.groundWater,
			this.runoff,
			this.waterRetention,
		);
	}
}