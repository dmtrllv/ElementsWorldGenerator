import { store } from "../../state";
import { param, Params } from "./parameters";
import type { WorldParams } from "./world-params";

@store
export class GeologicalParams extends Params<typeof GeologicalParams> {
	@param()
	public tectonicActivity: number;

	@param()
	public volcanicActivity: number;

	@param()
	public erosionStrength: number;

	@param()
	public bedrockHardness: number;

	public constructor(tectonicActivity: number, volcanicActivity: number, erosionStrength: number, bedrockHardness: number) {
		super();
		this.tectonicActivity = tectonicActivity;
		this.volcanicActivity = volcanicActivity;
		this.erosionStrength = erosionStrength;
		this.bedrockHardness = bedrockHardness;
	}

	public clone(_: WorldParams): GeologicalParams {
		return this.new(
			this.tectonicActivity,
			this.volcanicActivity,
			this.erosionStrength,
			this.bedrockHardness,
		);
	}
}