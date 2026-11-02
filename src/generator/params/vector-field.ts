import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { Param, type ParamInfo } from "./param";
import alea from "alea";
import { fnv1a } from "fast-fnv1a";
import type { WorldParams } from "../world-params";
import type { ScalarState } from "./scalar";
import { Vector2 } from "three";

export class VectorField extends Param<VectorFieldState> {
	private _noise2DX: NoiseFunction2D;
	private _noise2DY: NoiseFunction2D;

	public constructor(worldParams: WorldParams, info: ParamInfo<ScalarState>, state: ScalarState) {
		super(worldParams, info, state);
		this._noise2DX = this.createNoiseFn("x");
		this._noise2DY = this.createNoiseFn("y");

		worldParams.onSeedChange(() => {
			this._noise2DX = this.createNoiseFn("x");
			this._noise2DY = this.createNoiseFn("y");
		})
	}

	private createNoiseFn(axis: string) {
		const seed = fnv1a(`${this.worldParams.seed}:${this.name}:${this.state.seedOffset}:${axis}`);
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
			totalX += this._noise2DX(x * frequency, y * frequency) * amplitude;
			totalY += this._noise2DY(x * frequency, y * frequency) * amplitude;
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