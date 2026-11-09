import type { Region } from "../region";
import { dependency, GenerationScope, output, Pass } from "./pass";
import { ElevationMap, MountainMap } from "../maps/terrain";
import { SeaLevelParams } from "../param-groups/terrain/sea";
import { ElevationParams } from "../param-groups/terrain/elevation";
import { ContinentalMap, OceanMap } from "../maps";

export class ElevationPass extends Pass {
	@dependency(SeaLevelParams)
	public readonly seaLevel!: SeaLevelParams;

	@dependency(ElevationParams)
	public readonly params!: ElevationParams;

	@dependency(MountainMap)
	public readonly mountainMap!: MountainMap;

	@dependency(ContinentalMap)
	public readonly continentalMap!: ContinentalMap;

	@dependency(OceanMap)
	public readonly oceanMap!: OceanMap;

	@output(ElevationMap)
	public readonly elevationMap!: ElevationMap;

	public override generate(region: Region, _scope: GenerationScope): void {
		const continental = this.continentalMap.data;
		const ocean = this.oceanMap.data;
		const mountains = this.mountainMap.data;
		const output = this.elevationMap.data;

		const seaLevel = this.seaLevel.seaLevel.state;
		const landElevation = this.params.landElevation.state;
		const oceanDepth = this.params.oceanDepth.state;
		const mountainHeight = this.params.mountainHeight.state;

		const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

		for (let z = 0; z < region.height; z++) {
			for (let x = 0; x < region.width; x++) {
				const index = z * region.width + x;

				const landFactor = clamp((continental[index]! - 0.5) * 2, 0, 1);
				const oceanFactor = clamp((0.5 - continental[index]!) * 2, 0, 1);

				const smoothstep = (value: number) => value * value * (3 - 2 * value);

				const elevationLand = smoothstep(landFactor);
				const elevationOcean = smoothstep(oceanFactor) * clamp(ocean[index]!, 0, 1);

				let elevation = seaLevel;
				elevation += landElevation * elevationLand;
				elevation -= oceanDepth * elevationOcean;
				elevation += mountains[index]! * mountainHeight * elevationLand;

				output[index] = elevation;
			}
		}
	}
}