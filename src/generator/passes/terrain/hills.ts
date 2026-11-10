import { CoastMap, ContinentalMap } from "../../maps";
import { HillMap } from "../../maps/terrain";
import { HillParams } from "../../param-groups/terrain/hills";
import type { GenerationContext } from "../../context";
import type { Region } from "../../region";
import { benchmark, clamp } from "../../../utils";
import { dependency, output, Pass } from "../pass";

export class HillPass extends Pass {
	@dependency(ContinentalMap)
	public readonly continental!: ContinentalMap;

	@dependency(CoastMap)
	public readonly coast!: CoastMap;

	@dependency(HillParams)
	public readonly params!: HillParams;

	@output(HillMap)
	public readonly hillMap!: HillMap;

	@benchmark
	public override generate(_region: Region, context: GenerationContext): void {
		const continental = this.continental.data;
		const coast = this.coast.data;
		const output = this.hillMap.data;

		const samples = this.hillMap.samples;

		const { distribution, shape, warp, warpStrength, normalization, falloff } = this.params;

		const warpStrengthValue = warpStrength.state;

		const normalize = (value: number, min: number, max: number) => {
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
				const normalizedDistribution = normalize(distributionValue, normalization.min, normalization.max);

				const hillRegion = clamp(falloff.evaluate(normalizedDistribution), 0, 1);

				const shapeValue = shape.get(sampleX, sampleZ);
				const normalizedShape = normalize(shapeValue, -1, 1);

				const hillShape = Math.pow(normalizedShape, 1.5);

				const coastInfluence = clamp(coast[coastIndex]!, 0, 1);
				const coastalFactor = 1 - coastInfluence;

				output[index] = clamp(hillRegion * hillShape * coastalFactor, 0, 1);
			}
		}
	}
}
