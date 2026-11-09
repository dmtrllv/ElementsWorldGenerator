
import type { Region } from "../region";
import { dependency, GenerationScope, output, Pass } from "./pass";
import { ElevationMap, MountainMap } from "../maps/terrain";
import { SeaLevelParams } from "../param-groups/terrain/sea";
import { ElevationParams } from "../param-groups/terrain/elevation";
import { CoastMap, ContinentalMap, OceanMap } from "../maps";

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

	@dependency(CoastMap)
	public readonly coastMap!: CoastMap;

	@output(ElevationMap)
	public readonly elevationMap!: ElevationMap;

	public override generate(region: Region, _scope: GenerationScope): void {
		const continental = this.continentalMap.data;
		const ocean = this.oceanMap.data;
		const mountains = this.mountainMap.data;
		const coast = this.coastMap.data;
		const output = this.elevationMap.data;

		const seaLevel = this.seaLevel.seaLevel.state;
		const landElevation = Math.max(0, this.params.landElevation.state);
		const oceanDepth = Math.max(0, this.params.oceanDepth.state);
		const mountainHeight = Math.max(0, this.params.mountainHeight.state);
		const coastalElevation = Math.max(0, Math.min(this.params.coastalElevation.state, 1));

		const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
		const smoothstep = (value: number) => value * value * (3 - 2 * value);

		for (let z = 0; z < region.height; z++) {
			for (let x = 0; x < region.width; x++) {
				const index = z * region.width + x;

				const continentalValue = clamp(continental[index]!, 0, 1);

				const landFactor = smoothstep(clamp((continentalValue - 0.5) * 2, 0, 1));
				const oceanFactor = smoothstep(clamp((0.5 - continentalValue) * 2, 0, 1));

				const coastInfluence = clamp(coast[index]!, 0, 1);
				const coastalFactor = 1 - (coastInfluence * coastalElevation);

				const oceanDepthFactor = clamp(ocean[index]!, 0, 1);
				const mountainInfluence = clamp(mountains[index]!, 0, 1);

				let elevation = seaLevel;

				elevation += landElevation * landFactor * coastalFactor;
				elevation -= oceanDepth * oceanFactor * oceanDepthFactor;

				// MountainMap already handles continental boundaries and coastal suppression.
				// Do not attenuate mountain height a second time here.
				elevation += mountainHeight * mountainInfluence;

				output[index] = elevation;
			}
		}
	}
}
