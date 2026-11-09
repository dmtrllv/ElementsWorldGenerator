export abstract class MapData<T extends TypedArray = Float32Array> {
	private static readonly registry = new Map<MapDataType<any, any>, MapDataMeta<any>>();

	public static readonly getMeta = <T extends MapDataType<any, any>>(type: T): MapDataMeta<any> => {
		const meta = this.registry.get(type);
		if (!meta)
			throw new Error(`No meta defined on ${type.name}!`);
		return meta;
	}

	public static readonly register = <T extends MapDataType<any, any>>(meta: MapDataMeta<T>) => (target: T) => {
		this.registry.set(target, meta as any);
	}

	public static get types(): ReadonlyMap<MapDataType<any, any>, MapDataMeta<any>> {
		return this.registry;
	}

	public readonly data!: T;

	public constructor(data: T) {
		this.data = data;
	}

	public debug(_imageData: ImageData) { }

}

export type MapDataMeta<T extends MapDataType<any, any>> = T extends MapDataType<any, infer V> ? (V extends Float32Array ? {
	readonly type?: TypedArrayCtor<V>;
	readonly name: string;
	readonly description: string;
} : {
	readonly type: TypedArrayCtor<V>;
	readonly name: string;
	readonly description: string;
}) : never;

export type MapDataType<T extends MapData<Type>, Type extends TypedArray> = new (data: Type) => T;

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

export const renderFloat32 = (data: Float32Array, imageData: ImageData) => {
	const pixels = imageData.data;

	for (let i = 0; i < data.length; i++) {
		const value = Math.max(0, Math.min(1, data[i]!));
		const color = Math.round(value * 255);
		const index = i * 4;

		pixels[index] = color;
		pixels[index + 1] = color;
		pixels[index + 2] = color;
		pixels[index + 3] = 255;
	}
}