
import type { Region } from "../region";
import { dependency, output, Pass } from "./pass";
import { ElevationMap, MountainMap } from "../maps/terrain";
import { SeaLevelParams } from "../param-groups/terrain/sea";
import { ElevationParams } from "../param-groups/terrain/elevation";
import { CoastMap, ContinentalMap, OceanMap } from "../maps";
import type { GenerationContext } from "../context";
import { benchmark } from "../../utils";

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

	@benchmark
	public override generate(_region: Region, context: GenerationContext): void {
		const continental = this.continentalMap.data;
		const ocean = this.oceanMap.data;
		const mountains = this.mountainMap.data;
		const coast = this.coastMap.data;
		const output = this.elevationMap.data;

		const samples = this.elevationMap.samples;

		const seaLevel = this.seaLevel.seaLevel.state;
		const landElevation = Math.max(0, this.params.landElevation.state);
		const oceanDepth = Math.max(0, this.params.oceanDepth.state);
		const mountainHeight = Math.max(0, this.params.mountainHeight.state);
		const coastalElevation = Math.max(0, Math.min(this.params.coastalElevation.state, 1));

		const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
		const smoothstep = (value: number) => value * value * (3 - 2 * value);

		for (let z = 0; z < samples.height; z++) {
			for (let x = 0; x < samples.width; x++) {
				const worldX = samples.x + x * samples.resolution;
				const worldZ = samples.z + z * samples.resolution;

				const index = z * samples.width + x;

				const continentalIndex = context.getMapIndex(worldX, worldZ, this.continentalMap);
				const oceanIndex = context.getMapIndex(worldX, worldZ, this.oceanMap);
				const mountainIndex = context.getMapIndex(worldX, worldZ, this.mountainMap);
				const coastIndex = context.getMapIndex(worldX, worldZ, this.coastMap);

				const continentalValue = clamp(continental[continentalIndex]!, 0, 1);

				const landFactor = smoothstep(clamp((continentalValue - 0.5) * 2, 0, 1));
				const oceanFactor = smoothstep(clamp((0.5 - continentalValue) * 2, 0, 1));

				const coastInfluence = clamp(coast[coastIndex]!, 0, 1);
				const coastalFactor = 1 - (coastInfluence * coastalElevation);

				const oceanDepthFactor = clamp(ocean[oceanIndex]!, 0, 1);
				const mountainInfluence = clamp(mountains[mountainIndex]!, 0, 1);

				let elevation = seaLevel;

				elevation += landElevation * landFactor * coastalFactor;
				elevation -= oceanDepth * oceanFactor * oceanDepthFactor;

				elevation += mountainHeight * mountainInfluence;

				output[index] = elevation;
			}
		}
	}
}
