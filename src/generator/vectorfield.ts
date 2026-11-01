import alea from "alea";
import { Vector2 } from "three";
import { state, store } from "../state";
import type { WorldParams } from "./world";
import { fnv1a } from "fast-fnv1a";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import type { TextureWrapType } from "./scalar";

@store
export class VectorField {
	public readonly id: string;

	private _worldSeed: number;
	private _noiseX!: NoiseFunction2D;
	private _noiseY!: NoiseFunction2D;

	@state
	private _seedOffset: number = 0;

	public get seedOffset() {
		return this._seedOffset;
	}

	public set seedOffset(offset: number) {
		this._seedOffset = offset;
		this.createNoiseFns();
	}

	private createNoiseFns() {
		const create = (channel: string) => {
			const seed = fnv1a(`${this._worldSeed}:${this.id}:${this.seedOffset}:${channel}`);
			return createNoise2D(alea(seed));
		};

		this._noiseX = create("x");
		this._noiseY = create("y");
	}

	@state
	private _type: VectorFieldType = "procedural";

	public get type() {
		return this._type;
	}

	public set type(type: VectorFieldType) {
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
	public value: Vector2 = new Vector2(1, 0);

	@state
	private _texturePath: string | null = null;

	private texture: ImageData | null = null;

	public get texturePath(): string | null {
		return this._texturePath;
	}

	public set texturePath(path: string | null) {
		this._texturePath = path;
	}

	public setTexture(texture: ImageData | null) {
		this.texture = texture;
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

	public readonly dispose: () => void;

	public constructor(id: string, world: WorldParams, texture: string | null = null, value: Vector2 = new Vector2(1, 0)) {
		this.id = id;
		this._worldSeed = world.seed;
		this._texturePath = texture;
		this.value = value.clone();

		this.createNoiseFns();

		this.get = this.getProcedural;

		this.dispose = world.onSeedChange(seed => {
			this._worldSeed = seed;
			this.createNoiseFns();
		});
	}

	private readonly getStatic = (): Vector2 => {
		return this.value.clone();
	};

	private readonly getTexture = (x: number, y: number): Vector2 => {
		if (!this.texture)
			return new Vector2();

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
					return new Vector2();
				break;
		}

		const index = (y * width + x) * 4;

		return new Vector2((data[index]! / 255) * 2 - 1, (data[index + 1]! / 255) * 2 - 1).multiplyScalar(this.strength);
	};

	private readonly getProcedural = (x: number, y: number): Vector2 => {
		x = (x / this.scale) * this.frequency;
		y = (y / this.scale) * this.frequency;

		let amplitude = 1;
		let frequency = 1;

		let totalX = 0;
		let totalY = 0;
		let maxAmplitude = 0;

		for (let i = 0; i < this.octaves; i++) {
			totalX += this._noiseX(x * frequency, y * frequency) * amplitude;
			totalY += this._noiseY(x * frequency, y * frequency) * amplitude;

			maxAmplitude += amplitude;

			amplitude *= this.roughness;
			frequency *= 2;
		}

		return new Vector2(totalX / maxAmplitude, totalY / maxAmplitude).multiplyScalar(this.strength);
	};

	public get: (x: number, y: number) => Vector2 = this.getProcedural;

	public clone(world: WorldParams): VectorField {
		const field = new VectorField(
			this.id,
			world,
			this.texturePath,
			this.value
		);

		field.seedOffset = this.seedOffset;
		field.type = this.type;
		field.textureWrap = this.textureWrap;
		field.scale = this.scale;
		field.strength = this.strength;
		field.frequency = this.frequency;
		field.roughness = this.roughness;
		field.octaves = this.octaves;
		field.texture = this.texture;

		return field;
	}
}

export type VectorFieldType = "static" | "procedural" | "texture";