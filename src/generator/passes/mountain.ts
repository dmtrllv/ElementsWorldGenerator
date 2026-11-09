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

		const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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
				const sampleX = worldX + offset.x * warpStrength.state;
				const sampleZ = worldZ + offset.y * warpStrength.state;

				const distributionValue = distribution.get(sampleX, sampleZ);
				const clampedDistribution = (distributionValue - normalization.min) / (normalization.max - normalization.min);
				const normalizedDistribution = clamp(clampedDistribution, 0, 1);

				const mountainRegion = falloff.evaluate(normalizedDistribution);

				const shapeValue = shape.get(sampleX, sampleZ);
				const normalizedShape = (shapeValue + 1) * 0.5;

				const coastInfluence = clamp(coast[index]!, 0, 1);
				const coastalFactor = 1 - coastInfluence;

				output[index] = mountainRegion * normalizedShape * coastalFactor;
			}
		}
	}
}