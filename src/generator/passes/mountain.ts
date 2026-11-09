import { CoastMap, ContinentalMap } from "../maps";
import { MountainParams } from "../param-groups/terrain/mountains";
import type { Region } from "../region";
import { dependency, GenerationScope, output, Pass } from "./pass";
import { MountainMap } from "../maps/terrain";

export class MountainPass extends Pass {
	@dependency(ContinentalMap)
	public readonly continental!: ContinentalMap;

	@dependency(CoastMap)
	public readonly coast!: CoastMap;

	@dependency(MountainParams)
	public readonly params!: MountainParams;

	@output(MountainMap)
	public readonly mountainMap!: MountainMap;

	public override generate(region: Region, _scope: GenerationScope): void {
		const continental = this.continental.data;
		const coast = this.coast.data;
		const output = this.mountainMap.data;

		const { distribution, shape, warp, warpStrength, normalization, falloff } = this.params;
		const warpStrengthValue = warpStrength.state;

		const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
		const normalize = (value: number, min: number, max: number) => {
			if (max <= min)
				return value >= max ? 1 : 0;

			return clamp((value - min) / (max - min), 0, 1);
		};

		for (let z = 0; z < region.height; z++) {
			for (let x = 0; x < region.width; x++) {
				const index = z * region.width + x;

				if (continental[index]! < 0.5) {
					output[index] = 0;
					continue;
				}

				const worldX = region.x + x;
				const worldZ = region.z + z;

				const offset = warp.get(worldX, worldZ);
				const sampleX = worldX + offset.x * warpStrengthValue;
				const sampleZ = worldZ + offset.y * warpStrengthValue;

				const distributionValue = distribution.get(sampleX, sampleZ);
				const normalizedDistribution = normalize(distributionValue, normalization.min, normalization.max);
				const mountainRegion = clamp(falloff.evaluate(normalizedDistribution), 0, 1);

				const shapeValue = shape.get(sampleX, sampleZ);
				const normalizedShape = normalize(shapeValue, -1, 1);
				const mountainShape = Math.pow(normalizedShape, 1.5);

				const coastInfluence = clamp(coast[index]!, 0, 1);
				const coastalFactor = 1 - coastInfluence;

				output[index] = clamp(mountainRegion * mountainShape * coastalFactor, 0, 1);
			}
		}
	}
}
