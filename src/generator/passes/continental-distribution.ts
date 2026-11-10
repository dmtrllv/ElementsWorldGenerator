
import { benchmark, clamp } from "../../utils";
import type { GenerationContext } from "../context";
import { ContinentalThresholdMap } from "../maps";
import { GeographyParams } from "../param-groups";
import type { Region } from "../region";
import { dependency, output, Pass } from "./pass";

export const sampleContinentalDistribution = (params: GeographyParams["continental"], worldX: number, worldZ: number): number => {
	const warpStrength = params.warpStrength.state;
	const normalization = params.normalization;

	const warp = params.warp.get(worldX, worldZ);

	const warpedX = worldX + warp.x * warpStrength;
	const warpedZ = worldZ + warp.y * warpStrength;

	const value = params.distribution.get(warpedX, warpedZ);

	const normalized = normalization.max <= normalization.min ?
		(value >= normalization.max ? 1 : 0) :
		clamp((value - normalization.min) / (normalization.max - normalization.min), 0, 1);

	return clamp(params.shape.evaluate(normalized), 0, 1);
};

export class ContinentalDistributionPass extends Pass {
	@dependency(GeographyParams)
	public params!: GeographyParams;

	@output(ContinentalThresholdMap)
	public threshold!: ContinentalThresholdMap;

	@benchmark
	public override generate(_region: Region, context: GenerationContext): void {
		const samples = context.getSampleRegion();
		const params = this.params.continental;
		const landCoverage = params.landCoverage.state;

		if (!Number.isFinite(landCoverage) || landCoverage < 0 || landCoverage > 1)
			throw new RangeError("Land coverage must be between 0 and 1.");

		const width = samples.width;
		const height = samples.height;
		const sampleCount = width * height;

		if (sampleCount === 0)
			throw new Error("Cannot calculate land threshold from an empty distribution.");

		const binCount = 4096;
		const histogram = new Uint32Array(binCount);

		// Build a histogram without retaining the global distribution.
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const worldX = samples.x + x * samples.resolution;
				const worldZ = samples.z + z * samples.resolution;

				const value = sampleContinentalDistribution(params, worldX, worldZ);
				const bin = Math.min(binCount - 1, Math.floor(value * binCount));

				histogram[bin] = histogram[bin]! + 1;
			}
		}

		const rank = Math.floor((1 - landCoverage) * (sampleCount - 1));

		let cumulative = 0;
		let thresholdBin = 0;

		for (let i = 0; i < binCount; i++) {
			const next = cumulative + histogram[i]!;

			if (rank < next) {
				thresholdBin = i;
				break;
			}

			cumulative = next;
		}

		const bucket = new Float32Array(histogram[thresholdBin]!);
		let bucketIndex = 0;

		// Re-sample only values belonging to the selected histogram bin.
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const worldX = samples.x + x * samples.resolution;
				const worldZ = samples.z + z * samples.resolution;

				const value = sampleContinentalDistribution(params, worldX, worldZ);
				const bin = Math.min(binCount - 1, Math.floor(value * binCount));

				if (bin === thresholdBin)
					bucket[bucketIndex++] = value;
			}
		}

		bucket.sort();

		this.threshold.data[0] = bucket[rank - cumulative]!;
	}
}
