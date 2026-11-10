import { CoastMap, ContinentalMap } from "../../maps";
import { ValleyMap } from "../../maps/terrain";
import { ValleyParams } from "../../param-groups/terrain/valleys";
import type { GenerationContext } from "../../context";
import type { Region } from "../../region";
import { benchmark, clamp } from "../../../utils";
import { dependency, output, Pass } from "../pass";

export class ValleyPass extends Pass {
	@dependency(ContinentalMap)
	public readonly continental!: ContinentalMap;

	@dependency(CoastMap)
	public readonly coast!: CoastMap;

	@dependency(ValleyParams)
	public readonly params!: ValleyParams;

	@output(ValleyMap)
	public readonly valleyMap!: ValleyMap;

	@benchmark
	public override generate(_region: Region, context: GenerationContext): void {
		const continental = this.continental.data;
		const coast = this.coast.data;
		const output = this.valleyMap.data;

		const samples = this.valleyMap.samples;

		const { distribution, shape, warp, warpStrength } = this.params;

		const warpStrengthValue = warpStrength.state;

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
				const shapeValue = shape.get(sampleX, sampleZ);

				const valleyRegion = clamp((distributionValue + 1) * 0.5, 0, 1);
				const valleyShape = clamp((shapeValue + 1) * 0.5, 0, 1);

				const coastInfluence = clamp(coast[coastIndex]!, 0, 1);
				const coastalFactor = 1 - coastInfluence;

				output[index] = clamp(valleyRegion * valleyShape * coastalFactor, 0, 1);
			}
		}
	}
}