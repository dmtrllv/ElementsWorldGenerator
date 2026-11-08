import { Region } from "./region";
import type { WorldParamsSnapshot } from "./world-params";

export class Chunk {
	public readonly x: number;
	public readonly y: number;
	public readonly region: Region;

	public constructor(x: number, y: number, worldParams: WorldParamsSnapshot) {
		this.x = x;
		this.y = y;
		const chunkX = worldParams.chunkSize.x;
		const chunkY = worldParams.chunkSize.y;
		const hx = worldParams.size.x / 2;
		const hz = worldParams.size.z / 2;
		this.region = new Region(
			x * chunkX - hx,
			y * chunkY - hz,
			chunkX,
			chunkY
		);
	}
}
