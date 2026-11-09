import { MapData, renderFloat32 } from "./map";

@MapData.register({
	name: "Mountain",
	description: "Defines the mountain distribution across the world.",
})
export class MountainMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}