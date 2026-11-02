import { fnv1a } from "fast-fnv1a";
import type { WorldParams } from "../world-params";
import { Param, type ParamInfo } from "./param";
import alea from "alea";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

export class Scalar extends Param<ScalarState> {
	private _noise2D: NoiseFunction2D;

	public constructor(worldParams: WorldParams, info: ParamInfo<ScalarState>, state: ScalarState) {
		super(worldParams, info, state);
		this._noise2D = this.createNoiseFn();
		
		worldParams.onSeedChange(() => {
			this._noise2D = this.createNoiseFn();
		})
	}

	private createNoiseFn() {
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
			total += this._noise2D(x * frequency, y * frequency) * amplitude;
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