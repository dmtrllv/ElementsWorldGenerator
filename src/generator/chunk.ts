import { Region } from "./region";
import type { WorldParamsSnapshot } from "./world-params";

export class Chunk {
	public readonly x: number;
	public readonly y: number;
	public readonly region: Region;

	public constructor(x: number, y: number, worldParams: WorldParamsSnapshot) {
		this.x = x;
		this.y = y;
		const hx = worldParams.size.x / 2;
		const hz = worldParams.size.z / 2;
		this.region = new Region(
			x * worldParams.chunkSize - hx,
			y * worldParams.chunkSize - hz,
			worldParams.chunkSize,
			worldParams.chunkSize
		);
	}
}
