export abstract class MapData<T extends TypedArray = Float32Array> {
	private static readonly registry = new Map<MapDataType<any>, MapDataMeta<any>>();

	public static readonly getMeta = <T extends MapDataType<any>>(type: T): MapDataMeta<any> => {
		const meta = this.registry.get(type);
		if(!meta)
			throw new Error(`No meta defined on ${type.name}!`);
		return meta;
	}

	public static readonly register = <T extends MapDataType<any>>(meta: MapDataMeta<T>) => (target: T) => {
		this.registry.set(target, meta);
	}

	public static get types(): ReadonlyMap<MapDataType<any>, MapDataMeta<any>> {
		return this.registry;
	}

	public readonly data!: T;

	public constructor(data: T) {
		this.data = data;
	}
}

export type MapDataMeta<T extends MapDataType<any>> = T extends MapDataType<infer U> ? U extends MapData<infer V> ? (V extends Float32Array ? {
	readonly type?: TypedArrayCtor<V>;
	readonly name: string;
	readonly description: string;
} : {
	readonly type: TypedArrayCtor<V>;
	readonly name: string;
	readonly description: string;
}) : never : never;

export type MapDataType<T extends MapData<any>> = new (data: InferMapDataDataType<T>) => T;

type InferMapDataDataType<T extends MapData<any>> = T extends MapData<infer U> ? U : never;

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