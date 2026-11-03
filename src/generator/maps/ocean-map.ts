import { ParamMap } from "../param-map";

export class OceanMap extends ParamMap<number> {
	private readonly params = this.worldParams.geography.oceanParams;

	public override get(x: number, y: number): number {
		return 0;
	}
}