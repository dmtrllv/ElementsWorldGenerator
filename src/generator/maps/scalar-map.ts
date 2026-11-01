import type { Scalar } from "../scalar";
import { MapGenerator } from "./map";

export abstract class ScalarMap extends MapGenerator {
	protected abstract get scalar(): Scalar;

	public onGenerate(): void {
		const scalar = this.scalar;

		for (let z = 0; z < this.height; z++) {
			for (let x = 0; x < this.width; x++) {
				this.set(x, z, scalar.get(x, z));
			}
		}
	}
}