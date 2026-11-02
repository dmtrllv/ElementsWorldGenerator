import { ContinentalParams } from "./continental";
import { group, ParamGroup, subGroup } from "./param-group";

@group({
	name: "Geography",
	description: ""
})
export class GeographyParams extends ParamGroup<GeographyParams> {
	@subGroup(ContinentalParams)
	public readonly continental!: ContinentalParams;
}