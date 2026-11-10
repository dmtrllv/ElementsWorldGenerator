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

		const { distribution, shape, warp, warpStrength, depth, width, floorWidth, profile } = this.params;

		const warpStrengthValue = warpStrength.state;
		const widthValue = Math.max(width.state, 1);
		const floorWidthValue = clamp(floorWidth.state, 0, 1);
		const depthValue = Math.max(depth.state, 0);

		const gradientStep = Math.max(1, Math.min(widthValue * 0.1, samples.resolution));
		const halfWidth = widthValue * 0.5;

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

				const gradientX = (
					distribution.get(sampleX + gradientStep, sampleZ) -
					distribution.get(sampleX - gradientStep, sampleZ)
				) / (gradientStep * 2);

				const gradientZ = (
					distribution.get(sampleX, sampleZ + gradientStep) -
					distribution.get(sampleX, sampleZ - gradientStep)
				) / (gradientStep * 2);

				const gradientLength = Math.sqrt(gradientX * gradientX + gradientZ * gradientZ);

				if (gradientLength < 0.000001) {
					output[index] = 0;
					continue;
				}

				const distance = Math.abs(distributionValue) / gradientLength;
				const normalizedDistance = clamp(distance / halfWidth, 0, 1);

				let profilePosition = 0;

				if (floorWidthValue < 1) {
					profilePosition = clamp(
						(normalizedDistance - floorWidthValue) / (1 - floorWidthValue),
						0,
						1
					);
				}

				const valleyProfile = clamp(profile.evaluate(profilePosition), 0, 1);

				const shapeValue = shape.get(sampleX, sampleZ);
				const shapeFactor = clamp((shapeValue + 1) * 0.5, 0, 1);

				const coastInfluence = clamp(coast[coastIndex]!, 0, 1);
				const coastalFactor = 1 - coastInfluence;

				output[index] = clamp(valleyProfile * shapeFactor * coastalFactor, 0, 1);
			}
		}
	}
}
