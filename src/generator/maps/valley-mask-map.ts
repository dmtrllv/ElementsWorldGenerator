import { ScalarMap } from "./scalar-map";

export class ValleyMaskMap extends ScalarMap {
	protected get scalar() {
		return this.world.elevation.valleys;
	}
}