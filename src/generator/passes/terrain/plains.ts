import { CoastMap, ContinentalMap } from "../../maps";
import { PlainsMap } from "../../maps/terrain";
import { PlainParams } from "../../param-groups/terrain/plains";
import type { GenerationContext } from "../../context";
import type { Region } from "../../region";
import { benchmark, clamp } from "../../../utils";
import { dependency, output, Pass } from "../pass";

export class PlainsPass extends Pass {
	@dependency(ContinentalMap)
	public readonly continental!: ContinentalMap;

	@dependency(CoastMap)
	public readonly coast!: CoastMap;

	@dependency(PlainParams)
	public readonly params!: PlainParams;

	@output(PlainsMap)
	public readonly plainsMap!: PlainsMap;

	@benchmark
	public override generate(_region: Region, context: GenerationContext): void {
		const continental = this.continental.data;
		const coast = this.coast.data;
		const output = this.plainsMap.data;

		const samples = this.plainsMap.samples;

		const { distribution } = this.params;

		for (let z = 0; z < samples.height; z++) {
			for (let x = 0; x < samples.width; x++) {
				const worldX = samples.x + x * samples.resolution;
				const worldZ = samples.z + z * samples.resolution;

				const index = z * samples.width + x;
				const continentalIndex = context.getMapIndex(worldX, worldZ, this.continental);
				const coastIndex = context.getMapIndex(worldX, worldZ, this.coast);

				if (continental[continentalIndex]! < 0.5) {
					output[index] = 0;
					continue;
				}

				const distributionValue = distribution.get(worldX, worldZ);
				const plainsRegion = clamp(distributionValue, 0, 1);

				const coastInfluence = clamp(coast[coastIndex]!, 0, 1);
				const coastalFactor = 1 - coastInfluence;

				output[index] = clamp(plainsRegion * coastalFactor, 0, 1);
			}
		}
	}
}