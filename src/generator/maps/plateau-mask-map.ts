import { ScalarMap } from "./scalar-map";

export class PlateauMaskMap extends ScalarMap {
	protected get scalar() {
		return this.world.elevation.plateaus;
	}
}