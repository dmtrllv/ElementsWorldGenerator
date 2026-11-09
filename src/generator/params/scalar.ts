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
		const width = this.worldParams.size.x;
		const height = this.worldParams.size.z;

		const angleX = (x / width) * Math.PI * 2;
		const angleY = (y / height) * Math.PI * 2;

		const radiusX = width / (Math.PI * 2 * this.state.scale);
		const radiusY = height / (Math.PI * 2 * this.state.scale);

		let amplitude = 1;
		let frequency = 1;

		let total = 0;
		let maxAmplitude = 0;

		for (let i = 0; i < this.state.octaves; i++) {
			total += this.noise4D(
				Math.cos(angleX) * radiusX * frequency,
				Math.sin(angleX) * radiusX * frequency,
				Math.cos(angleY) * radiusY * frequency,
				Math.sin(angleY) * radiusY * frequency
			) * amplitude;

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
};