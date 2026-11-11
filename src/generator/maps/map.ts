import { white, type Color } from "../../utils";
import type { WorldParamsSnapshot } from "../world-params";

export type SampleRegion = {
	readonly x: number;
	readonly z: number;
	readonly width: number;
	readonly height: number;
	readonly resolution: number;
};

export abstract class MapData<T extends TypedArray = Float32Array> {
	private static readonly registry = new Map<MapDataType<any, any>, MapDataMeta<any>>();

	public static readonly getMeta = <T extends MapDataType<any, any>>(type: T): MapDataMeta<any> => {
		const meta = this.registry.get(type);
		if (!meta)
			throw new Error(`No meta defined on ${type.name}!`);
		return meta;
	}

	public static fromName(name: string) {
		for (const [type] of this.registry) {
			if (type.name === name)
				return type;
		}
		return null;
	}

	public static readonly register = <T extends MapDataType<any, any>>(meta: MapDataMeta<T>) => (target: T) => {
		this.registry.set(target, meta as any);
	}

	public static get types(): ReadonlyMap<MapDataType<any, any>, MapDataMeta<any>> {
		return this.registry;
	}

	public readonly data!: T;
	public readonly samples: SampleRegion;

	public constructor(data: T, samples: SampleRegion) {
		this.data = data;
		this.samples = samples;
	}

	public debug(imageData: ImageData, _worldParams: WorldParamsSnapshot, renderType: DebugRenderType, color: Color) {
		console.log("render", renderType)
		return renderFloat32(this.data as any, imageData, val => {
			if (renderType === "factor")
				return val;
			return renderThresholdBorder(val);
		}, color);
	}
}

export type DebugRenderType = "border" | "factor";


export type MapDataMeta<T extends MapDataType<any, any>> = T extends MapDataType<any, infer V> ? (V extends Float32Array ? {
	readonly type?: TypedArrayCtor<V>;
	readonly name: string;
	readonly description: string;
	readonly sampleRegion?: SampleRegion;
} : {
	readonly type: TypedArrayCtor<V>;
	readonly name: string;
	readonly description: string;
	readonly sampleRegion?: SampleRegion;
}) : never;

export type MapDataType<T extends MapData<Type>, Type extends TypedArray> = new (data: Type, samples: SampleRegion) => T;

export type TypedArray =
	| Int8Array
	| Uint8Array
	| Uint8ClampedArray
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array;

export type TypedArrayCtor<T extends TypedArray> =
	T extends Int8Array ? Int8ArrayConstructor :
	T extends Uint8Array ? Uint8ArrayConstructor :
	T extends Uint8ClampedArray ? Uint8ClampedArrayConstructor :
	T extends Int16Array ? Int16ArrayConstructor :
	T extends Uint16Array ? Uint16ArrayConstructor :
	T extends Int32Array ? Int32ArrayConstructor :
	T extends Uint32Array ? Uint32ArrayConstructor :
	T extends Float32Array ? Float32ArrayConstructor :
	T extends Float64Array ? Float64ArrayConstructor :
	never;

export const renderFloat32 = (data: Float32Array, imageData: ImageData, normalizer: (val: number) => (number | undefined) = n => Math.max(0, Math.min(1, n!)), color: Color = white) => {
	const pixels = imageData.data;

	for (let i = 0; i < data.length; i++) {
		const value = normalizer(data[i]!);
		if (value === undefined)
			continue;

		const index = i * 4;

		pixels[index + 0] = Math.round(value * color[0]);
		pixels[index + 1] = Math.round(value * color[1]);
		pixels[index + 2] = Math.round(value * color[2]);
		pixels[index + 3] = 255;
	}
};

const THRESHOLD = 0.5;
const THRESHOLD_DELTA = 0.001;

export const renderThresholdBorder = (val: number) => {
	if (val < THRESHOLD + THRESHOLD_DELTA && val > THRESHOLD - THRESHOLD_DELTA) {
		return 1;
	}
	return undefined;
};