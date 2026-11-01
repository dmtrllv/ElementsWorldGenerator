import alea from "alea";
import { state, store } from "../state";
import type { WorldParams } from "./params";
import { fnv1a } from "fast-fnv1a";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { Curve } from "./curve";

@store
export class Scalar {
	public readonly id: string;

	private _worldSeed: number;
	private _noise2D: NoiseFunction2D;

	@state
	private _seedOffset: number = 0;

	public get seedOffset() {
		return this._seedOffset;
	}

	public set seedOffset(offset: number) {
		this._seedOffset = offset;
		this._noise2D = this.createNoiseFn();
	}

	private createNoiseFn() {
		const seed = fnv1a(`${this._worldSeed}:${this.id}:${this.seedOffset}`);
		return createNoise2D(alea(seed));
	}

	@state
	private _type: ScalarType;

	public get type() {
		return this._type;
	}

	public set type(type: ScalarType) {
		this._type = type;

		switch (type) {
			case "static":
				this.get = this.getStatic;
				break;
			case "procedural":
				this.get = this.getProcedural;
				break;
			case "texture":
				this.get = this.getTexture;
				break;
		}
	}

	@state
	private _normalization: NormalizationType = "0/1";

	public get normalization() {
		return this._normalization;
	}

	public set normalization(normalization: NormalizationType) {
		this._normalization = normalization;

		switch (normalization) {
			case "-1/1":
				this.normalize = x => (x * 2) - 1;
				break;
			case "0/1":
				this.normalize = x => x;
				break;
		}
	}

	@state
	public value: number = 1;

	@state
	private _texturePath: string | null = null;

	private texture: ImageData | null = null;

	public get texturePath(): string | null {
		return this._texturePath;
	}

	@state
	public textureWrap: TextureWrapType = "wrap";

	@state
	public scale: number = 1;

	@state
	public strength: number = 1;

	@state
	public frequency: number = 1;

	@state
	public roughness: number = 0.5;

	@state
	public octaves: number = 4;

	@state
	public readonly curve: Curve;

	@state
	public useCurve: boolean = false;

	public readonly dispose: () => void;

	public constructor(id: string, world: WorldParams, texture: string | null, value: number, type: ScalarType, curve: Curve, props: ScalarProps = {}) {
		this.id = id;
		this._worldSeed = world.seed;
		this._noise2D = this.createNoiseFn();
		this._texturePath = texture;
		this.value = value;
		this.curve = curve;

		this.normalize = x => (x * 2) - 1;
		this.get = this.getProcedural;

		this.dispose = world.onSeedChange(seed => {
			this._worldSeed = seed;
			this._noise2D = this.createNoiseFn();
		});
		this._type = type;
		this.type = type;

		Object.assign(this, props);
	}

	private readonly getStatic = (_x: number, _y: number): number => {
		return this.applyCurve(this.value);
	};

	private readonly getTexture = (x: number, y: number): number => {
		if (!this.texture)
			return 0;

		const { width, height, data } = this.texture;

		x = Math.floor(x / this.scale);
		y = Math.floor(y / this.scale);

		switch (this.textureWrap) {
			case "clamp":
				x = Math.max(0, Math.min(width - 1, x));
				y = Math.max(0, Math.min(height - 1, y));
				break;

			case "wrap":
				x = ((x % width) + width) % width;
				y = ((y % height) + height) % height;
				break;

			case "none":
				if (x < 0 || x >= width || y < 0 || y >= height)
					return 0;
				break;
		}

		const index = (y * width + x) * 4;
		const value = data[index]!;

		return this.applyCurve(this.normalize(value / 255));
	}

	private readonly getProcedural = (x: number, y: number): number => {
		x = (x / this.scale) * this.frequency;
		y = (y / this.scale) * this.frequency;

		let amplitude = 1;
		let frequency = 1;

		let total = 0;
		let maxAmplitude = 0;

		for (let i = 0; i < this.octaves; i++) {
			total += this._noise2D(x * frequency, y * frequency) * amplitude;
			maxAmplitude += amplitude;
			amplitude *= this.roughness;
			frequency *= 2;
		}

		return this.applyCurve(this.normalize(((total / maxAmplitude) * this.strength + 1) / 2));
	};

	private applyCurve(value: number): number {
		if (!this.useCurve)
			return value;

		const input = this.normalization === "-1/1"
			? (value + 1) / 2
			: value;

		const output = this.curve.evaluate(input);

		return this.normalization === "-1/1"
			? (output * 2) - 1
			: output;
	}

	public get: (x: number, y: number) => number = this.getProcedural;

	private normalize: (x: number) => number;

	public clone(world: WorldParams) {
		return new Scalar(this.id, world, this.texturePath, this.value, this.type, this.curve.clone(), {
			scale: this.scale,
			strength: this.strength,
			frequency: this.frequency,
			roughness: this.roughness,
			octaves: this.octaves,
			useCurve: this.useCurve,
		});
	}
}

export type ScalarType = "static" | "procedural" | "texture";
export type NormalizationType = "-1/1" | "0/1";
export type TextureWrapType = "wrap" | "clamp" | "none";

export type ScalarProps = {
	scale?: number;
	strength?: number;
	frequency?: number;
	roughness?: number;
	octaves?: number;
	useCurve?: boolean;
}