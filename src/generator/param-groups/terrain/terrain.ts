import { group, ParamGroup, subGroup } from "../param-group";
import { ElevationParams } from "./elevation";
import { HillParams } from "./hills";
import { MountainParams } from "./mountains";
import { PlateauParams } from "./plateaus";
import { SeaLevelParams } from "./sea";
import { ValleyParams } from "./valleys";

@group({
	name: "Terrain",
	description: ""
})
export class TerrainParams extends ParamGroup<TerrainParams> {
	@subGroup(MountainParams)
	public readonly mountains!: MountainParams;

	@subGroup(HillParams)
	public readonly hills!: HillParams;

	@subGroup(ValleyParams)
	public readonly valleys!: ValleyParams;

	@subGroup(PlateauParams)
	public readonly plateaus!: PlateauParams;

	@subGroup(SeaLevelParams)
	public readonly seaLevel!: SeaLevelParams;

	@subGroup(ElevationParams)
	public readonly elevation!: ElevationParams;
}