import { ScalarMap } from "./scalar-map";

export class MountainMaskMap extends ScalarMap {
	protected get scalar() {
		return this.world.elevation.mountains;
	}
}