import { ScalarMap } from "./scalar-map";

export class ContinentalnessMap extends ScalarMap {
	protected get scalar() {
		return this.world.elevation.continental;
	}
}