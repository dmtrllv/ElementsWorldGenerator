import { CoastMap, ContinentalMap, OceanMap } from "../maps";
import { GeographyParams } from "../param-groups";
import type { Region } from "../region";
import { dependency, output, Pass } from "./pass";

export class GeographyPass extends Pass {
	@dependency(GeographyParams)
    public params!: GeographyParams;

    @output(ContinentalMap)
    public continental!: ContinentalMap;

    @output(OceanMap)
    public ocean!: OceanMap;

    @output(CoastMap)
    public coast!: CoastMap;

    public override generate(region: Region): void {
        
    }
}