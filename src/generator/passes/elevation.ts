import type { Region } from "../region";
import { dependency, output, Pass } from "./pass";
import { ElevationMap, HillMap, MountainMap, PlateauMap, PlainsMap, ValleyMap } from "../maps";
import { SeaLevelParams, } from "../param-groups/terrain/sea";
import { ElevationParams, } from "../param-groups/terrain/elevation";
import { HillParams, } from "../param-groups/terrain/hills";
import { PlainParams, } from "../param-groups/terrain/plains";
import { PlateauParams, } from "../param-groups/terrain/plateaus";
import { ValleyParams, } from "../param-groups/terrain/valleys";
import { CoastMap, ContinentalMap, OceanMap } from "../maps";
import type { GenerationContext } from "../context";
import { benchmark, clamp } from "../../utils";

export class ElevationPass extends Pass {
	@dependency(SeaLevelParams)
	public readonly seaLevel!: SeaLevelParams;

	@dependency(ElevationParams)
	public readonly params!: ElevationParams;

	@dependency(HillParams)
	public readonly hillParams!: HillParams;

	@dependency(PlainParams)
	public readonly plainParams!: PlainParams;

	@dependency(PlateauParams)
	public readonly plateauParams!: PlateauParams;

	@dependency(ValleyParams)
	public readonly valleyParams!: ValleyParams;

	@dependency(MountainMap)
	public readonly mountainMap!: MountainMap;

	@dependency(HillMap)
	public readonly hillMap!: HillMap;

	@dependency(PlainsMap)
	public readonly plainsMap!: PlainsMap;

	@dependency(PlateauMap)
	public readonly plateauMap!: PlateauMap;

	@dependency(ValleyMap)
	public readonly valleyMap!: ValleyMap;

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
		const hills = this.hillMap.data;
		const plains = this.plainsMap.data;
		const plateaus = this.plateauMap.data;
		const valleys = this.valleyMap.data;
		const coast = this.coastMap.data;
		const output = this.elevationMap.data;

		const samples = this.elevationMap.samples;

		const seaLevel = this.seaLevel.seaLevel.state;
		const landElevation = Math.max(0, this.params.landElevation.state);
		const oceanDepth = Math.max(0, this.params.oceanDepth.state);
		const mountainHeight = Math.max(0, this.params.mountainHeight.state);
		const coastalElevation = clamp(this.params.coastalElevation.state, 0, 1);

		const hillHeight = Math.max(0, this.hillParams.height.state);
		const plainsUndulationStrength = Math.max(0, this.plainParams.undulationStrength.state);
		const plainsRoughnessStrength = Math.max(0, this.plainParams.roughnessStrength.state);
		const plainsFlatness = clamp(this.plainParams.flatness.state, 0, 1);
		const plateauHeight = Math.max(0, this.plateauParams.height.state);
		const valleyDepth = Math.max(0, this.valleyParams.depth.state);

		const { undulation, roughness } = this.plainParams;
		const { shape: plateauShape } = this.plateauParams;

		const plainsVariationFactor = 1 - plainsFlatness;

		const smoothstep = (value: number) => value * value * (3 - 2 * value);

		for (let z = 0; z < samples.height; z++) {
			for (let x = 0; x < samples.width; x++) {
				const worldX = samples.x + x * samples.resolution;
				const worldZ = samples.z + z * samples.resolution;

				const index = z * samples.width + x;

				const continentalIndex = context.getMapIndex(worldX, worldZ, this.continentalMap);
				const oceanIndex = context.getMapIndex(worldX, worldZ, this.oceanMap);
				const mountainIndex = context.getMapIndex(worldX, worldZ, this.mountainMap);
				const hillIndex = context.getMapIndex(worldX, worldZ, this.hillMap);
				const plainsIndex = context.getMapIndex(worldX, worldZ, this.plainsMap);
				const plateauIndex = context.getMapIndex(worldX, worldZ, this.plateauMap);
				const valleyIndex = context.getMapIndex(worldX, worldZ, this.valleyMap);
				const coastIndex = context.getMapIndex(worldX, worldZ, this.coastMap);

				const continentalValue = clamp(continental[continentalIndex]!, 0, 1);

				const landFactor = smoothstep(clamp((continentalValue - 0.5) * 2, 0, 1));
				const oceanFactor = smoothstep(clamp((0.5 - continentalValue) * 2, 0, 1));

				const coastInfluence = clamp(coast[coastIndex]!, 0, 1);
				const coastalFactor = 1 - (coastInfluence * (1 - coastalElevation));

				const oceanDepthFactor = clamp(ocean[oceanIndex]!, 0, 1);
				const mountainInfluence = clamp(mountains[mountainIndex]!, 0, 1);
				const hillInfluence = clamp(hills[hillIndex]!, 0, 1);
				const plainsInfluence = clamp(plains[plainsIndex]!, 0, 1);
				const plateauInfluence = clamp(plateaus[plateauIndex]!, 0, 1);
				const valleyInfluence = clamp(valleys[valleyIndex]!, 0, 1);

				const plainsUndulation = undulation.get(worldX, worldZ) * plainsUndulationStrength;
				const plainsRoughness = roughness.get(worldX, worldZ) * plainsRoughnessStrength;

				const plateauVariation = plateauShape.get(worldX, worldZ) * plateauHeight * 0.1;

				let elevation = seaLevel;

				elevation += landElevation * landFactor * coastalFactor;
				elevation -= oceanDepth * oceanFactor * oceanDepthFactor;

				elevation += mountainHeight * mountainInfluence * landFactor;
				elevation += hillHeight * hillInfluence * landFactor;
				elevation += plateauInfluence * (plateauHeight + plateauVariation) * landFactor;
				elevation -= valleyDepth * valleyInfluence * landFactor;

				elevation += (plainsUndulation + plainsRoughness) * plainsInfluence * plainsVariationFactor * landFactor;

				output[index] = elevation;
			}
		}
	}
}
