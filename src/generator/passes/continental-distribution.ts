import { clamp } from "../../utils";
import type { GenerationContext } from "../context";
import { ContinentalDistributionMap } from "../maps";
import { GeographyParams } from "../param-groups";
import type { Region } from "../region";
import { dependency, output, Pass } from "./pass";

export class ContinentalDistributionPass extends Pass {
	@dependency(GeographyParams)
	public params!: GeographyParams;

	@output(ContinentalDistributionMap)
	public distribution!: ContinentalDistributionMap;

	public override generate(_region: Region, context: GenerationContext): void {
		const params = this.params.continental;
		const samples = context.getSampleRegion();

		const width = samples.width;
		const height = samples.height;

		const warpStrength = params.warpStrength.state;
		const normalization = params.normalization;

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;

				const worldX = samples.x + x * samples.resolution;
				const worldZ = samples.z + z * samples.resolution;

				const warp = params.warp.get(worldX, worldZ);

				const warpedX = worldX + warp.x * warpStrength;
				const warpedZ = worldZ + warp.y * warpStrength;

				const value = params.distribution.get(warpedX, warpedZ);
				const normalized = normalization.max <= normalization.min ?
					(value >= normalization.max ? 1 : 0) :
					clamp((value - normalization.min) / (normalization.max - normalization.min), 0, 1);

				this.distribution.data[index] = clamp(params.shape.evaluate(normalized), 0, 1);
			}
		}

		this.distribution.setLandCoverage(params.landCoverage.state);
	}
}