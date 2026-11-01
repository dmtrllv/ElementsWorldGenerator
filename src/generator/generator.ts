import type { World } from "./world";

export class Generator {
	public readonly worldParams: World;

	public constructor(worldParams: World) {
		this.worldParams = worldParams;
	}
}