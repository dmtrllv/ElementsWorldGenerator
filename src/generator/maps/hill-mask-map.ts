import { ScalarMap } from "./scalar-map";

export class HillMaskMap extends ScalarMap {
	protected get scalar() {
		return this.world.elevation.hills;
	}
}