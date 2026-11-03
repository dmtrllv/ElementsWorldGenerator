import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { Param } from "./param";
import alea from "alea";
import { fnv1a } from "fast-fnv1a";
import { Vector2 } from "three";
import { computed } from "../../reactive";

export class VectorField extends Param<VectorFieldState> {
	@computed
	private get noise2DX():NoiseFunction2D {
		const seed = fnv1a(`${this.worldParams.seed}:${this.name}:${this.state.seedOffset}:x`);
		return createNoise2D(alea(seed));
	}

	@computed
	private get noise2DY():NoiseFunction2D {
		const seed = fnv1a(`${this.worldParams.seed}:${this.name}:${this.state.seedOffset}:y`);
		return createNoise2D(alea(seed));
	}

	public get(x: number, y: number): Vector2 {
		x = x / this.state.scale;
		y = y / this.state.scale;

		let amplitude = 1;
		let frequency = 1;

		let totalX = 0;
		let totalY = 0;
		let maxAmplitude = 0;

		for (let i = 0; i < this.state.octaves; i++) {
			totalX += this.noise2DX(x * frequency, y * frequency) * amplitude;
			totalY += this.noise2DY(x * frequency, y * frequency) * amplitude;
			maxAmplitude += amplitude;

			amplitude *= this.state.persistence;
			frequency *= this.state.lacunarity;
		}

		return new Vector2((totalX / maxAmplitude) * this.state.strength, (totalY / maxAmplitude) * this.state.strength);
	}
}

export type VectorFieldState = {
	seedOffset: number;
	scale: number;
	strength: number;
	persistence: number;
	lacunarity: number;
	octaves: number;
}