import { CoastMap, ContinentalMap } from "../../maps";
import { PlateauMap } from "../../maps/terrain";
import { PlateauParams } from "../../param-groups/terrain/plateaus";
import type { GenerationContext } from "../../context";
import type { Region } from "../../region";
import { benchmark, clamp } from "../../../utils";
import { dependency, output, Pass } from "../pass";

export class PlateauPass extends Pass {
	@dependency(ContinentalMap)
	public readonly continental!: ContinentalMap;

	@dependency(CoastMap)
	public readonly coast!: CoastMap;

	@dependency(PlateauParams)
	public readonly params!: PlateauParams;

	@output(PlateauMap)
	public readonly plateauMap!: PlateauMap;

	@benchmark
	public override generate(_region: Region, context: GenerationContext): void {
		const continental = this.continental.data;
		const coast = this.coast.data;
		const output = this.plateauMap.data;

		const samples = this.plateauMap.samples;

		const { distribution, warp, warpStrength, normalization, falloff } = this.params;

		const warpStrengthValue = warpStrength.state;
		const min = normalization.min;
		const max = normalization.max;

		const normalize = (value: number) => {
			if (max <= min)
				return value >= max ? 1 : 0;

			return clamp((value - min) / (max - min), 0, 1);
		};

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

				const offset = warp.get(worldX, worldZ);
				const sampleX = worldX + offset.x * warpStrengthValue;
				const sampleZ = worldZ + offset.y * warpStrengthValue;

				const distributionValue = distribution.get(sampleX, sampleZ);
				const normalizedDistribution = normalize(distributionValue);

				const plateauRegion = clamp(falloff.evaluate(normalizedDistribution), 0, 1);

				const coastInfluence = clamp(coast[coastIndex]!, 0, 1);
				const coastalFactor = 1 - coastInfluence;

				output[index] = clamp(plateauRegion * coastalFactor, 0, 1);
			}
		}
	}
}