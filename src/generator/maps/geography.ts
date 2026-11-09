import { MapData, renderFloat32 } from "./map";

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
