import { MapData } from "./map";

@MapData.register({
	name: "Continental",
	description: "Defines the landmass distribution across the world."
})
export class ContinentalMap extends MapData {}

@MapData.register({
	name: "Ocean",
	description: "Defines the distribution and boundaries of ocean regions."
})
export class OceanMap extends MapData {}

@MapData.register({
	name: "Coast",
	description: "Defines the transition between continental land and ocean."
})
export class CoastMap extends MapData {}