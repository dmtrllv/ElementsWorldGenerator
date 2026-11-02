
import { useEffect, useState } from "react";

const STATE_META = Symbol("STATE_META");
const STORE_CLASS = Symbol("STORE_CLASS");

type Dispatcher<T = any> = (value: { state: T }) => void;
type ObservableRegistry = WeakMap<object, Dispatcher[]>;

const OBSERVABLES: ObservableRegistry = new WeakMap();

type StoreInstance = {
	proxy: any;
	values: Map<PropertyKey, any>;
	proxies: Map<PropertyKey, any>;
	dispatchers: Map<PropertyKey, Dispatcher[]>;
	classDispatchers: Dispatcher[];
	register: (meta: PropertyKey[]) => void;
};

const STORE_INSTANCES = new WeakMap<object, StoreInstance>();

const getOwnMeta = (Class: any): PropertyKey[] => {
	if (!Object.prototype.hasOwnProperty.call(Class, STATE_META))
		Object.defineProperty(Class, STATE_META, { value: [], writable: false });

	return Class[STATE_META];
};

const getOriginalClass = (Class: any): any => {
	while (Object.prototype.hasOwnProperty.call(Class, STORE_CLASS))
		Class = Class[STORE_CLASS];

	return Class;
};

const getMeta = (Class: any): PropertyKey[] => {
	Class = getOriginalClass(Class);

	const parent = Object.getPrototypeOf(Class);
	const inherited = parent && parent !== Function.prototype? getMeta(parent): [];

	return [...new Set([...inherited, ...getOwnMeta(Class)])];
};

const getDispatchers = (obj: any): Dispatcher[] | null => {
	if (obj === null || (typeof obj !== "object" && typeof obj !== "function"))
		return null;

	return OBSERVABLES.get(obj) || null;
};

const createStore = (target: any): StoreInstance => {
	const values = new Map<PropertyKey, any>();
	const proxies = new Map<PropertyKey, any>();
	const dispatchers = new Map<PropertyKey, Dispatcher[]>();
	const classDispatchers: Dispatcher[] = [];

	let proxiedSelf: any;

	const notify = (key: PropertyKey) => {
		const value = { state: proxies.get(key) };

		dispatchers.get(key)?.slice().forEach(dispatcher => dispatcher(value));
		classDispatchers.slice().forEach(dispatcher => dispatcher({ state: proxiedSelf }));
	};

	const setProxy = (key: PropertyKey, value: any) => {
		values.set(key, value);

		if (value === null || typeof value !== "object") {
			proxies.delete(key);
			return;
		}

		if (OBSERVABLES.has(value)) {
			proxies.set(key, value);
			return;
		}

		let propertyDispatchers = dispatchers.get(key);

		if (!propertyDispatchers) {
			propertyDispatchers = [];
			dispatchers.set(key, propertyDispatchers);
		}

		const current = proxies.get(key);

		if (current && current !== value && values.get(key) === value)
			proxies.delete(key);

		if (!proxies.has(key)) {
			const proxy = new Proxy(value, {
				get(target, property) {
					return Reflect.get(target, property, target);
				},
				set(target, property, newValue) {
					const result = Reflect.set(target, property, newValue, target);

					if (result)
						notify(key);

					return result;
				},
				deleteProperty(target, property) {
					const result = Reflect.deleteProperty(target, property);

					if (result)
						notify(key);

					return result;
				},
				defineProperty(target, property, descriptor) {
					const result = Reflect.defineProperty(target, property, descriptor);

					if (result)
						notify(key);

					return result;
				}
			});

			proxies.set(key, proxy);
			OBSERVABLES.set(proxy, propertyDispatchers);
		}
	};

	const register = (meta: PropertyKey[]) => {
		for (const key of meta) {
			if (values.has(key))
				continue;

			dispatchers.set(key, []);
			setProxy(key, Reflect.get(proxiedSelf, key, proxiedSelf));
		}
	};

	proxiedSelf = new Proxy(target, {
		get(target, property) {
			if (property === "constructor")
				return target.constructor;

			if (values.has(property))
				return proxies.has(property) ? proxies.get(property) : values.get(property);

			return Reflect.get(target, property, proxiedSelf);
		},
		set(target, property, newValue) {
			if (values.has(property)) {
				setProxy(property, newValue);
				Reflect.set(target, property, newValue, target);
				notify(property);
				return true;
			}

			return Reflect.set(target, property, newValue, proxiedSelf);
		},
		deleteProperty(target, property) {
			if (values.has(property)) {
				values.delete(property);
				proxies.delete(property);
				Reflect.deleteProperty(target, property);
				notify(property);
				return true;
			}

			return Reflect.deleteProperty(target, property);
		},
		defineProperty(target, property, descriptor) {
			const result = Reflect.defineProperty(target, property, descriptor);

			if (result && values.has(property)) {
				setProxy(property, Reflect.get(target, property, target));
				notify(property);
			}

			return result;
		}
	});

	const instance: StoreInstance = {
		proxy: proxiedSelf,
		values,
		proxies,
		dispatchers,
		classDispatchers,
		register
	};

	STORE_INSTANCES.set(proxiedSelf, instance);
	OBSERVABLES.set(proxiedSelf, classDispatchers);

	return instance;
};

const bindMethods = (instance: any, proxy: any) => {
	for (const key in instance) {
		const value = instance[key];

		if (typeof value !== "function")
			continue;

		if (!Object.prototype.hasOwnProperty.call(value, "prototype"))
			continue;

		instance[key] = value.bind(proxy);
	}
};

export const observable = (Class: any): any => {
	const meta = getMeta(Class);

	const Wrapped = class extends Class {
		public constructor(...args: any[]) {
			super(...args);

			let instance = STORE_INSTANCES.get(this);

			if (!instance) {
				instance = createStore(this);
				bindMethods(this, instance.proxy);
			}

			instance.register(meta);

			return instance.proxy;
		}
	};

	Object.defineProperty(Wrapped, STORE_CLASS, { value: Class });

	return Wrapped;
};

export const state = <T extends object>(target: T, key: PropertyKey) => {
	const meta = getOwnMeta(target.constructor);

	if (!meta.includes(key))
		meta.push(key);
};

export const observe = <T>(state: T): T => {
	const dispatchers = getDispatchers(state);

	if (!dispatchers)
		throw new Error("value is not an observable state!");

	const [value, setValue] = useState<{ state: T }>({ state });

	useEffect(() => {
		const dispatcher: Dispatcher<T> = next => setValue(next);

		dispatchers.push(dispatcher);

		return () => {
			const index = dispatchers.indexOf(dispatcher);

			if (index !== -1)
				dispatchers.splice(index, 1);
		};
	}, [dispatchers]);

	useEffect(() => {
		setValue({ state });
	}, [state]);

	return value.state;
};
