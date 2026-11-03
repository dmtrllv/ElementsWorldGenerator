import { fnv1a } from "fast-fnv1a";
import { Param } from "./param";
import alea from "alea";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { computed, observable } from "../../reactive";

@observable({ inherit: true })
export class Scalar extends Param<ScalarState> {
	@computed
	private get noise2D(): NoiseFunction2D {
		const seed = fnv1a(`${this.worldParams.seed}:${this.name}:${this.state.seedOffset}`);
		return createNoise2D(alea(seed));
	}

	public get(x: number, y: number): number {
		x = x / this.state.scale;
		y = y / this.state.scale;

		let amplitude = 1;
		let frequency = 1;

		let total = 0;
		let maxAmplitude = 0;

		for (let i = 0; i < this.state.octaves; i++) {
			total += this.noise2D(x * frequency, y * frequency) * amplitude;
			maxAmplitude += amplitude;

			amplitude *= this.state.persistence;
			frequency *= this.state.lacunarity;
		}

		return (total / maxAmplitude) * this.state.strength;
	}
}

export type ScalarState = {
	seedOffset: number;
	scale: number;
	strength: number;
	persistence: number;
	lacunarity: number;
	octaves: number;
}