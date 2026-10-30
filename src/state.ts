import { useEffect, useState } from "react";

const STATE_META = Symbol("STATE_META");

type Dispatcher<T = any> = (value: { state: T }) => void;

type ObservableRegistry = WeakMap<object, Dispatcher[]>;

const OBSERVABLES: ObservableRegistry = new WeakMap();

const getMeta = (Class: any): string[] => {
	if (!Object.prototype.hasOwnProperty.call(Class, STATE_META))
		Object.defineProperty(Class, STATE_META, { value: [], writable: false });

	return Class[STATE_META];
};

const getDispatchers = (obj: any): Dispatcher[] | null => {
	if (obj === null || (typeof obj !== "object" && typeof obj !== "function"))
		return null;

	return OBSERVABLES.get(obj) || null;
};

export const store = (Class: any): any => {
	const meta = [...getMeta(Class)];

	return class extends Class {
		public constructor(...args: any[]) {
			super(...args);

			const self = this as any;
			const values: Record<string | number | symbol, any> = {};
			const proxies: Record<string | number | symbol, any> = {};
			const dispatchers: Record<string | number | symbol, Dispatcher[]> = {};
			const classDispatchers: Dispatcher[] = [];

			let proxiedSelf: any;

			const notify = (key: string | number | symbol) => {
				const value = { state: proxies[key] };

				dispatchers[key]?.slice().forEach(dispatcher => dispatcher(value));
				classDispatchers.slice().forEach(dispatcher => dispatcher({ state: proxiedSelf }));
			};

			const setProxy = (key: string | number | symbol, value: any) => {
				values[key] = value;

				if (value === null || typeof value !== "object") {
					delete proxies[key];
					return value;
				}

				if (!dispatchers[key])
					dispatchers[key] = [];

				if (!proxies[key] || proxies[key] === value) {
					proxies[key] = new Proxy(value, {
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

					OBSERVABLES.set(proxies[key], dispatchers[key]);
				}

				return proxies[key];
			};

			for (const key of meta) {
				dispatchers[key] = [];
				setProxy(key, self[key]);
			}

			proxiedSelf = new Proxy(this, {
				get(target, property) {
					if (property === "constructor")
						return target.constructor;

					if (Object.prototype.hasOwnProperty.call(values, property))
						return values[property] !== null && typeof values[property] === "object" ? proxies[property] : values[property];

					return Reflect.get(target, property, proxiedSelf);
				},
				set(target, property, newValue) {
					if (Object.prototype.hasOwnProperty.call(values, property)) {
						setProxy(property, newValue);
						Reflect.set(target, property, newValue, target);
						notify(property);
						return true;
					}

					return Reflect.set(target, property, newValue, proxiedSelf);
				},
				deleteProperty(target, property) {
					if (Object.prototype.hasOwnProperty.call(values, property)) {
						delete values[property];
						delete proxies[property];
						notify(property);
						return true;
					}

					return Reflect.deleteProperty(target, property);
				}
			});

			OBSERVABLES.set(proxiedSelf, classDispatchers);

			for (const key in this) {
				if (typeof this[key] === "function")
					this[key] = this[key].bind(proxiedSelf);
			}

			return proxiedSelf;
		}
	};
};

export const state = (target: any, key: string | symbol) => {
	const meta = getMeta(target.constructor);

	if (!meta.includes(key as string))
		meta.push(key as string);
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