import { getObservableState, notifyObservable, registerObservableState, trackObservableRead, type ObservableState } from "./internal";

type Constructor<T extends object = object> = (new (...args: any[]) => T) | (abstract new (...args: any[]) => T);

type ClassMetadata = {
	prototype: object;
	config: ObservableConfig;
};

const PROPERTY_METADATA = new WeakMap<object, Set<PropertyKey>>();
const CLASS_METADATA = new WeakMap<object, ClassMetadata>();
const CONSTRUCTION_FIELDS = new WeakMap<object, Set<PropertyKey>>();
const CONSTRUCTION_TRACKED = new WeakMap<object, Set<PropertyKey>>();

const normalizeConfig = (config?: Partial<ObservableConfig>): ObservableConfig => ({
	inherit: config?.inherit ?? false,
	auto: config?.auto ?? false
});

const registerProperty = (target: object, key: PropertyKey): void => {
	let properties = PROPERTY_METADATA.get(target);

	if (!properties)
		PROPERTY_METADATA.set(target, properties = new Set());

	properties.add(key);
};

const getRegisteredProperties = (prototype: object, inherit: boolean): Set<PropertyKey> => {
	const properties = new Set<PropertyKey>();
	let current: object | null = prototype;

	while (current && current !== Object.prototype) {
		for (const key of PROPERTY_METADATA.get(current) ?? [])
			properties.add(key);

		if (!inherit)
			break;

		current = Object.getPrototypeOf(current) as object | null;
	}

	return properties;
};

const getClassMetadata = (target: Function): ClassMetadata | undefined => {
	const prototype = Reflect.get(target, "prototype") as object | undefined;
	return prototype ? CLASS_METADATA.get(prototype) : undefined;
};

const makeObservable = <T extends object>(value: T, tracked: Iterable<PropertyKey>, trackNewProperties: boolean, constructor: any): T => {
	const existing = getObservableState(value);

	if (existing)
		return existing.proxy as T;

	const state: ObservableState = {
		proxy: value,
		tracked: new Set(tracked),
		trackNewProperties,
		listeners: new Set(),
		keyedListeners: new Map()
	};

	let setting = 0;
	let proxy: T;

	proxy = new Proxy(value, {
		get(target, key, receiver) {
			if(key === "constructor")
				return constructor;
			trackObservableRead(state, key);
			return Reflect.get(target, key, receiver);
		},
		set(target, key, next, receiver) {
			const previous = Reflect.get(target, key, receiver);

			setting++;
			const success = Reflect.set(target, key, next, receiver);
			setting--;

			if (!success)
				return false;

			if (!state.tracked.has(key) && state.trackNewProperties)
				state.tracked.add(key);

			const current = Reflect.get(target, key, receiver);

			if (state.tracked.has(key) && !Object.is(previous, current))
				notifyObservable(state, key, current);

			return true;
		},
		defineProperty(target, key, descriptor) {
			const previous = Reflect.get(target, key, proxy);
			const success = Reflect.defineProperty(target, key, descriptor);

			if (!success || setting > 0)
				return success;

			if (!state.tracked.has(key) && state.trackNewProperties)
				state.tracked.add(key);

			const current = Reflect.get(target, key, proxy);

			if (state.tracked.has(key) && !Object.is(previous, current))
				notifyObservable(state, key, current);

			return true;
		},
		deleteProperty(target, key) {
			const existed = Reflect.has(target, key);
			const success = Reflect.deleteProperty(target, key);

			if (success && existed && state.tracked.has(key))
				notifyObservable(state, key, undefined);

			return success;
		}
	});

	state.proxy = proxy;
	registerObservableState(value, proxy, state);

	return proxy;
};

const decorateClass = <T extends Constructor>(target: T, config: ObservableConfig): T => {
	const prototype = target.prototype;

	CLASS_METADATA.set(prototype, { prototype, config });

	let decorated: T;

	decorated = new Proxy(target, {
		construct(original, args, newTarget) {
			const instance = Reflect.construct(original, args, newTarget);

			const inheritedFields = CONSTRUCTION_FIELDS.get(instance) ?? new Set<PropertyKey>();
			const ownFields = Reflect.ownKeys(instance).filter(key => !inheritedFields.has(key));

			CONSTRUCTION_FIELDS.set(instance, new Set([...inheritedFields, ...ownFields]));

			const inheritedTracked = CONSTRUCTION_TRACKED.get(instance) ?? new Set<PropertyKey>();
			const tracked = new Set(config.inherit ? inheritedTracked : []);

			for (const key of getRegisteredProperties(prototype, config.inherit))
				tracked.add(key);

			if (config.auto) {
				for (const key of ownFields)
					tracked.add(key);
			}

			if (newTarget !== decorated && getClassMetadata(newTarget)) {
				CONSTRUCTION_TRACKED.set(instance, tracked);
				return instance;
			}

			return makeObservable(instance, tracked, config.auto, decorated);
		}
	});

	return decorated;
};

export const observable: ObservableDecorator = ((configOrTarget: unknown, key?: PropertyKey) => {
	if (key !== undefined) {
		registerProperty(configOrTarget as object, key);
		return;
	}

	if (typeof configOrTarget === "function")
		return decorateClass(configOrTarget as Constructor, normalizeConfig());

	const config = normalizeConfig(configOrTarget as Partial<ObservableConfig> | undefined);

	return (target: Constructor) => decorateClass(target, config);
}) as ObservableDecorator;

export const createObservable = <T extends object>(value: T): T => {
	const existing = getObservableState(value);

	if (existing)
		return existing.proxy as T;

	return makeObservable(value, Reflect.ownKeys(value), true, value.constructor);
};

export interface ObservableDecorator {
	<T extends Constructor>(target: T): T;
	(config?: Partial<ObservableConfig>): <T extends Constructor>(target: T) => T;
	(target: object, key: string | symbol): void;
}

export type ObservableConfig = {
	inherit: boolean;
	auto: boolean;
};