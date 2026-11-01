import { MapGenerator } from "./map";

export class LatitudeMap extends MapGenerator {
	public onGenerate(): void {
		const params = this.world.latitude;
		const { axis, frequency, offset, distortion } = params;

		const size = axis === "x" ? this.height : this.width;

		this.clear();

		const staticLatitude = Math.sin(-Math.PI / 2 + (offset / (size - 1)) * Math.PI);

		for (let z = 0; z < this.height; z++) {
			for (let x = 0; x < this.width; x++) {
				const position = axis === "x" ? z : x;
				const t = (position + offset) / (size - 1);

				let latitude = frequency === 0
					? staticLatitude
					: Math.sin(-Math.PI / 2 + t * Math.abs(frequency) * Math.PI) * Math.sign(frequency);

				latitude += distortion.get(x, z);
				latitude = Math.max(-1, Math.min(1, latitude));

				this.set(x, z, latitude);
			}
		}
	}
}