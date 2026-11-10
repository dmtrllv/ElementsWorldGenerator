import { fnv1a } from "fast-fnv1a";
import { Param } from "./param";
import alea from "alea";
import { createNoise4D, type NoiseFunction4D } from "simplex-noise";
import { computed, observable } from "../../reactive";

@observable({ inherit: true })
export class Scalar extends Param<ScalarState> {
	@computed
	private get noise4D(): NoiseFunction4D {
		const seed = fnv1a(`${this.worldParams.seed}:${this.name}:${this.state.seedOffset}`);
		return createNoise4D(alea(seed));
	}

	public get(x: number, y: number): number {
		const state = this.state;
		const width = this.worldParams.size.x;
		const height = this.worldParams.size.z;

		const angleX = x * (Math.PI * 2 / width);
		const angleY = y * (Math.PI * 2 / height);

		const scaleX = state.relativeScale ? state.scale * width : state.scale;
		const scaleY = state.relativeScale ? state.scale * height : state.scale;

		const radiusX = width / (Math.PI * 2 * scaleX);
		const radiusY = height / (Math.PI * 2 * scaleY);

		const cosax = Math.cos(angleX) * radiusX;
		const sinax = Math.sin(angleX) * radiusX;
		const cosay = Math.cos(angleY) * radiusY;
		const sinay = Math.sin(angleY) * radiusY;

		const noise4D = this.noise4D;

		let amplitude = 1;
		let frequency = 1;

		let total = 0;
		let maxAmplitude = 0;

		for (let i = 0; i < state.octaves; i++) {
			total += noise4D(
				cosax * frequency,
				sinax * frequency,
				cosay * frequency,
				sinay * frequency
			) * amplitude;

			maxAmplitude += amplitude;

			amplitude *= state.persistence;
			frequency *= state.lacunarity;
		}

		return (total / maxAmplitude) * state.strength;
	}
}

export type ScalarState = {
	seedOffset: number;
	scale: number;
	strength: number;
	persistence: number;
	lacunarity: number;
	octaves: number;
	relativeScale: boolean;
};