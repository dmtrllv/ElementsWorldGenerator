import type { World } from "./world";

export class Generator {
	public readonly world: World;

	public constructor(world: World) {
		this.world = world;
	}
}