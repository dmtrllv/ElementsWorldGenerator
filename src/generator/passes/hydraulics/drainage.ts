import type { GenerationContext } from "../../context";
import type { Region } from "../../region";
import { Pass } from "../pass";

export class DrainagePass extends Pass {
	public override generate(region: Region, context: GenerationContext): void {
		throw new Error("Method not implemented.");
	}

}