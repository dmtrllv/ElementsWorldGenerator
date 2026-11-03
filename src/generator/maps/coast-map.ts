import { ParamMap } from "../param-map";

export class CoastMap extends ParamMap<number> {
	private readonly params = this.worldParams.geography.coastParams;

	public override get(x: number, y: number): number {
		return 0;
	}
}