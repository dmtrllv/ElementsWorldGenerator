import { MapData } from "./map";

@MapData.register({
	name: "Continental",
	description: "Defines the landmass distribution across the world.",
})
export class ContinentalMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}

@MapData.register({
	name: "Ocean",
	description: "Defines the distribution and boundaries of ocean regions."
})
export class OceanMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}

@MapData.register({
	name: "Coast",
	description: "Defines the transition between continental land and ocean."
})
export class CoastMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}

const renderFloat32 = (data: Float32Array, imageData: ImageData) => {
	const pixels = imageData.data;

	for (let i = 0; i < data.length; i++) {
		const value = Math.max(0, Math.min(1, data[i]!));
		const color = Math.round(value * 255);
		const index = i * 4;

		pixels[index] = color;
		pixels[index + 1] = color;
		pixels[index + 2] = color;
		pixels[index + 3] = 255;
	}
}