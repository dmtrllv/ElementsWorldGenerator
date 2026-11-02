import { CoastParams } from "./coast";
import { ContinentalParams } from "./continental";
import { OceanParams } from "./ocean";
import { group, ParamGroup, subGroup } from "./param-group";

@group({
	name: "Geography",
	description: ""
})
export class GeographyParams extends ParamGroup<GeographyParams> {
	@subGroup(ContinentalParams)
	public readonly continental!: ContinentalParams;

	@subGroup(OceanParams)
	public readonly oceanParams!: OceanParams;

	@subGroup(CoastParams)
	public readonly coastParams!: CoastParams;
}