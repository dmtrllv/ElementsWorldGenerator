import { store } from "../state";
import { Params, param } from "./parameters";
import type { WorldParams } from "./world";

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
