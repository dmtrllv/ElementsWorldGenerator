import { createNoise4D, type NoiseFunction4D } from "simplex-noise";
import { Param } from "./param";
import alea from "alea";
import { fnv1a } from "fast-fnv1a";
import { Vector2 } from "three";
import { computed, observable } from "../../reactive";

@observable({ inherit: true })
export class VectorField extends Param<VectorFieldState> {
	@computed
	private get noise4DX(): NoiseFunction4D {
		const seed = fnv1a(`${this.worldParams.seed}:${this.name}:${this.state.seedOffset}:x`);
		return createNoise4D(alea(seed));
	}

	@computed
	private get noise4DY(): NoiseFunction4D {
		const seed = fnv1a(`${this.worldParams.seed}:${this.name}:${this.state.seedOffset}:y`);
		return createNoise4D(alea(seed));
	}


	public get(x: number, y: number): Vector2 {
		return this.getInto(x, y, new Vector2());
	}

	public getInto(x: number, y: number, target: Vector2): Vector2 {
		const width = this.worldParams.size.x;
		const height = this.worldParams.size.z;

		const angleX = (x / width) * Math.PI * 2;
		const angleY = (y / height) * Math.PI * 2;

		const scaleX = this.state.relativeScale ? this.state.scale * width : this.state.scale;
		const scaleY = this.state.relativeScale ? this.state.scale * height : this.state.scale;

		const radiusX = width / (Math.PI * 2 * scaleX);
		const radiusY = height / (Math.PI * 2 * scaleY);

		const noise4DX = this.noise4DX;
		const noise4DY = this.noise4DY;

		let amplitude = 1;
		let frequency = 1;

		let totalX = 0;
		let totalY = 0;
		let maxAmplitude = 0;

		for (let i = 0; i < this.state.octaves; i++) {
			const nx = Math.cos(angleX) * radiusX * frequency;
			const ny = Math.sin(angleX) * radiusX * frequency;
			const nz = Math.cos(angleY) * radiusY * frequency;
			const nw = Math.sin(angleY) * radiusY * frequency;

			totalX += noise4DX(nx, ny, nz, nw) * amplitude;
			totalY += noise4DY(nx, ny, nz, nw) * amplitude;
			maxAmplitude += amplitude;

			amplitude *= this.state.persistence;
			frequency *= this.state.lacunarity;
		}

		return target.set(
			(totalX / maxAmplitude) * this.state.strength,
			(totalY / maxAmplitude) * this.state.strength
		);
	}

}

export type VectorFieldState = {
	seedOffset: number;
	scale: number;
	strength: number;
	persistence: number;
	lacunarity: number;
	octaves: number;
	relativeScale: boolean;
};