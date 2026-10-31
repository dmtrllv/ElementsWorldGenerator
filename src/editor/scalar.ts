import { store, state } from "../state";
import { randomSeed } from "../utils";

@store
export class Scalar {
	@state
	private _seedOffset: number = 0;

	public get seedOffset() {
		return this._seedOffset;
	}

	//public set seedOffset() {

	//}

	private _baseSeed: number;

	//public get seed() {

	//}

	@state
	private _type: ScalarType = "procedural";

	public get type() {
		return this._type;
	}

	public set type(type: ScalarType) {
		this._type = type;
		switch (type) {
			case "static":
				this.get = () => this.value;
			case "procedural":
				this.get = this.getProcedural;
			case "texture":
				this.get = this.getTexture;
		}
	}

	@state
	private _normalization: NormalizationType = "-1/1";

	public get normalization() {
		return this._normalization;
	}

	public set normalization(normalization: NormalizationType) {
		this.normalization = normalization;
		switch (normalization) {
			case "-1/1":
				this.normalize = (x) => (x * 2) - 1;
			case "0/1":
				this.normalize = x => x;
		}
	}

	public constructor(baseSeed: number = 0) {
		this._baseSeed = baseSeed;
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
	public scale: number = 1;

	@state
	public strength: number = 1;

	@state
	public frequency: number = 1;

	@state
	public roughness: number = 1;

	private getTexture = (x: number, y: number): number => {
		if (!this.texture)
			return 0;

		x = x / this.scale;
		y = y / this.scale;

		const index = (y * this.texture.width + x) * 4;
		const value = this.texture.data[index];

		return this.normalize(value / 255)
	}

	private getProcedural = (x: number, y: number): number => {
		throw new Error("Todo");
	}

	public get: (x: number, y: number) => number = this.getProcedural;
	private normalize!: (x: number) => number;
}

export type ScalarType = "static" | "procedural" | "texture";
export type NormalizationType = "-1/1" | "0/1";