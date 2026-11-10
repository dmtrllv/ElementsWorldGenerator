import { Vector2 } from "three";
import { benchmark, clamp } from "../../utils";
import type { GenerationContext } from "../context";
import { ContinentalThresholdMap } from "../maps";
import { GeographyParams } from "../param-groups";
import type { Region } from "../region";
import { dependency, output, Pass } from "./pass";

const HISTOGRAM_BIN_COUNT = 65536;
const HISTOGRAM_BIN_SCALE = HISTOGRAM_BIN_COUNT;

export const sampleContinentalDistribution = (params: GeographyParams["continental"], worldX: number, worldZ: number, warpTarget = new Vector2()): number => {
	const warpStrength = params.warpStrength.state;
	const normalization = params.normalization;

	params.warp.getInto(worldX, worldZ, warpTarget);

	const warpedX = worldX + warpTarget.x * warpStrength;
	const warpedZ = worldZ + warpTarget.y * warpStrength;

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

		const histogram = new Uint32Array(HISTOGRAM_BIN_COUNT);
		const warpTarget = new Vector2();

		const startX = samples.x;
		const startZ = samples.z;
		const resolution = samples.resolution;

		let worldZ = startZ;

		for (let z = 0; z < height; z++, worldZ += resolution) {
			let worldX = startX;

			for (let x = 0; x < width; x++, worldX += resolution) {
				const value = sampleContinentalDistribution(params, worldX, worldZ, warpTarget);
				const bin = Math.min(HISTOGRAM_BIN_COUNT - 1, (value * HISTOGRAM_BIN_SCALE) | 0);

				histogram[bin]!++;
			}
		}

		const rank = Math.floor((1 - landCoverage) * (sampleCount - 1));

		let cumulative = 0;

		for (let i = 0; i < HISTOGRAM_BIN_COUNT; i++) {
			const count = histogram[i]!;

			if (rank < cumulative + count) {
				this.threshold.data[0] = (i + 0.5) / HISTOGRAM_BIN_SCALE;
				return;
			}

			cumulative += count;
		}

		this.threshold.data[0] = 1;
	}
}