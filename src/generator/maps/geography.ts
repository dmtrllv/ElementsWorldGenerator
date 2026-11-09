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

@MapData.register({
	name: "Continental Distribution",
	description: "Stores the coarse global distribution of continental landmasses before land classification."
})
export class ContinentalDistributionMap extends MapData {
	private _landThreshold: number | null = null;

	public get landThreshold(): number {
		if (this._landThreshold === null)
			throw new Error("Land threshold has not been calculated.");

		return this._landThreshold;
	}

	public setLandCoverage(landCoverage: number): void {
		if (!Number.isFinite(landCoverage) || landCoverage < 0 || landCoverage > 1)
			throw new RangeError("Land coverage must be between 0 and 1.");

		if (this.data.length === 0)
			throw new Error("Cannot calculate land threshold from an empty distribution map.");

		const values = Array.from(this.data).sort((a, b) => a - b);
		const index = Math.floor((1 - landCoverage) * (values.length - 1));

		this._landThreshold = values[index]!;
	}

	public override debug(imageData: ImageData): void {
		renderFloat32(this.data, imageData);
	}
}