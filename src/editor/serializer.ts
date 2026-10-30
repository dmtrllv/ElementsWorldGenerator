const SERIALIZE_TYPES = Symbol("SERIALIZE_TYPES");

type SerializeTypes = Record<string, {
	type: (new () => any) | typeof Json;
	serializer?: new () => Serializer<any>;
}>;

export abstract class Serializer<T> {
	private static getTypes(constructor: Function): SerializeTypes | undefined {
		return (constructor as any)[SERIALIZE_TYPES];
	}

	public static serialize<T extends typeof Serializer<U>, U extends {}>(this: T, object: U): string {
		const types = Serializer.getTypes(object.constructor);
		if (!types)
			throw new Error(`Object ${object.constructor.name} is not serializable!`);
		const serialized: Record<string, any> = {};
		for (const k in types) {
			const val = object[k as keyof typeof object];
			if (types[k].serializer)
				serialized[k] = new types[k].serializer().serialize(val);
			else
				serialized[k] = val;
		}
		return JSON.stringify(serialized);
	}

	
	public static deserialize<T extends typeof Serializer<U>, U extends {}>(this: T, type: new () => U, string: string): U {
		const types = Serializer.getTypes(type);
		if (!types)
			throw new Error(`Type ${type.name} is not serializable!`);
		const parsed: Record<string, any> = JSON.parse(string);
		for (const k in types) {
			const val = parsed[k];
			if (types[k].serializer)
				parsed[k] = new types[k].serializer().deserialize(types[k].type, val);
			else if(![Json, Number, String, Boolean].includes(types[k].type as any))
				parsed[k] = Object.assign(new (types[k].type as any)(), parsed[k]);
		}
		return Object.assign(new type(), parsed);;
	}

	protected abstract serialize(object: T): string;
	protected abstract deserialize(target: SerializableType<T> | Json, string: string): T;
}

export const Json = Symbol("JSON_TYPE");
export type Json = typeof Json;

export const serializable = <T, K extends keyof T>(type: SerializableType<T[K]> | Json = Json, serializer?: Serializer<T[K]>) => (target: T, key: K) => {
	if (!(target as any).constructor[SERIALIZE_TYPES])
		(target as any).constructor[SERIALIZE_TYPES] = {};
	(target as any).constructor[SERIALIZE_TYPES][key] = { type, serializer };
}

export type SerializableType<T> =
	T extends number ? NumberConstructor :
	T extends string ? StringConstructor :
	T extends boolean ? BooleanConstructor :
	new () => T