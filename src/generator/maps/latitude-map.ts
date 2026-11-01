import { MapGenerator } from "./map";

export class LatitudeMap extends MapGenerator {
	public onGenerate(): void {
		const params = this.world.latitude;
		const { axis, frequency, offset, distortion } = params;

		const size = axis === "x" ? this.height : this.width;


		if (frequency === 0) {
			const staticLatitude = Math.sin(-Math.PI / 2 + offset * Math.PI);
			for (let z = 0; z < this.height; z++)
				for (let x = 0; x < this.width; x++)
					this.set(x, z, staticLatitude);
		}

		for (let z = 0; z < this.height; z++) {
			for (let x = 0; x < this.width; x++) {
				const position = axis === "x" ? z : x;
				const t = position / (size - 1) + offset;

				let latitude = Math.sin(-Math.PI / 2 + t * Math.abs(frequency) * Math.PI);

				if (frequency < 0)
					latitude *= -1;

				latitude += distortion.get(x, z);
				latitude = Math.max(-1, Math.min(1, latitude));

				this.set(x, z, latitude);
			}
		}
	}
}