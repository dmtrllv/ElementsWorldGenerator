import { MapGenerator } from "./map";
import { ContinentalnessMap } from "./continentalness-map";
import { MountainMaskMap } from "./mountain-mask-map";
import { HillMaskMap } from "./hill-mask-map";
import { ValleyMaskMap } from "./valley-mask-map";
import { PlateauMaskMap } from "./plateau-mask-map";

export class ElevationMap extends MapGenerator {
	public onGenerate(): void {
		const continentalness = this.worldMap.generate(ContinentalnessMap, true);
		const mountains = this.worldMap.generate(MountainMaskMap, true);
		const hills = this.worldMap.generate(HillMaskMap, true);
		const valleys = this.worldMap.generate(ValleyMaskMap, true);
		const plateaus = this.worldMap.generate(PlateauMaskMap, true);

		const params = this.world.elevation;

		for (let z = 0; z < this.height; z++) {
			for (let x = 0; x < this.width; x++) {
				const base = params.base.evaluate(continentalness.get(x, z));

				const mountain = params.mountainProfile.evaluate(mountains.get(x, z)) * params.mountainHeight;
				const hill = params.hillProfile.evaluate(hills.get(x, z)) * params.hillHeight;
				const valley = params.valleyProfile.evaluate(valleys.get(x, z)) * params.valleyDepth;
				const plateau = params.plateauProfile.evaluate(plateaus.get(x, z)) * params.plateauHeight;

				const elevation = base + mountain + hill - valley + plateau;

				this.set(x, z, Math.max(0, Math.min(1, elevation)));
			}
		}
	}
}