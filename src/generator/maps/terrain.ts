import { red } from "../../utils";
import type { WorldParamsSnapshot } from "../world-params";
import { MapData, renderFloat32, type DebugRenderType } from "./map";

@MapData.register({
	name: "Mountain",
	description: "Defines the mountain distribution across the world.",
})
export class MountainMap extends MapData {
	public override debug(imageData: ImageData, _worldParams: WorldParamsSnapshot, renderType: DebugRenderType): void {
		renderFloat32(this.data, imageData, val => {
			if (renderType === "factor")
				return val;
			return renderThresholdBorder(val);
		}, red);
	}
}

@MapData.register({
	name: "Hill",
	description: "Defines the hill distribution across the world.",
})
export class HillMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}

@MapData.register({
	name: "Plains",
	description: "Defines the plains distribution across the world.",
})
export class PlainsMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}

@MapData.register({
	name: "Plateau",
	description: "Defines the plateau distribution across the world.",
})
export class PlateauMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}

@MapData.register({
	name: "Valley",
	description: "Defines the valley distribution across the world.",
})
export class ValleyMap extends MapData {
	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}

@MapData.register({
	name: "Elevation",
	description: "Defines the elevation across the world.",
})
export class ElevationMap extends MapData {
	public override debug(imageData: ImageData, worldParams: WorldParamsSnapshot, renderType: DebugRenderType): void {
		const elevation = worldParams.terrain.elevation;
		const seaLevel = worldParams.terrain.seaLevel;

		const min = seaLevel.seaLevel.state - elevation.oceanDepth.state;
		const max = seaLevel.seaLevel.state + elevation.landElevation.state + elevation.mountainHeight.state;

		renderFloat32(this.data, imageData, value => {
			const val = (value - min) / (max - min);
			if (renderType === "factor")
				return val;
			return renderThresholdBorder(val);
		});
	}
}

const THRESHOLD = 0.5;
const THRESHOLD_DELTA = 0.001;

export const renderThresholdBorder = (val: number) => {
	if (val < THRESHOLD + THRESHOLD_DELTA && val > THRESHOLD - THRESHOLD_DELTA) {
		return 1;
	}
	return undefined;
};