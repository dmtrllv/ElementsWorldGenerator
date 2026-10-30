import { useEffect, useState } from "react";

const STATE_META = Symbol("STATE_META");

const DISPATCHERS = Symbol("DISPATCHERS");

const getMeta = (Class: any): string[] => {
	if (!Class[STATE_META])
		Class[STATE_META] = [];
	return Class[STATE_META];
};

const getDispatchers = (obj: any) => obj[DISPATCHERS] || null;

export const store = (Class: any): any => {
	const meta = getMeta(Class);

	return class extends Class {
		public constructor(...args: any) {
			super(...args);
			const self = this as any;

			const values: Record<string | number | symbol, any> = {};
			const proxies: Record<string | number | symbol, any> = {};
			const dispatchers: Record<string | number | symbol, any[]> = {};
			const classDispatchers: any[] = [];

			const setProxy = (key: string | number | symbol, value: any) => {
				values[key] = value;
				dispatchers[key] = [];
				proxies[key] = new Proxy(value && (typeof value === "object") ? value : {}, {
					get(_, p) {
						if (p === DISPATCHERS)
							return dispatchers[key];

						return values[key][p];
					},
					set(target, p, newValue, receiver) {
						const result = Reflect.set(target, p, newValue, receiver);

						dispatchers[key].forEach(d => d({ state: proxies[key] }));
						classDispatchers.forEach(d => d({ state: proxiedSelf }));

						return result;
					},
					deleteProperty(target, p) {
						const result = Reflect.deleteProperty(target, p);

						dispatchers[key].forEach(d => d({ state: proxies[key] }));
						classDispatchers.forEach(d => d({ state: proxiedSelf }));

						return result;
					}
				});

				return value && (typeof value === "object") ? proxies[key] : value;
			};

			for (const k of meta) {
				Object.assign(this, {
					[k]: setProxy(k, self[k])
				});
			}

			const proxiedSelf = new Proxy(this, {
				get(target, p) {
					if (p === DISPATCHERS)
						return classDispatchers;
					if (p in values) {
						const val = values[p];

						if (val === null)
							return null;

						switch (typeof val) {
							case "object":
								return proxies[p as keyof typeof proxies];
							default: // primitives
								return val;
						}
					}

					return target[p as keyof typeof target];
				},
				set(target, p, newValue) {
					if (p in values) {
						if (newValue && (typeof newValue === "object")) {
							target[p as keyof typeof target] = setProxy(p, newValue);
						} else {
							target[p as keyof typeof target] = newValue
							values[p as keyof typeof values] = newValue;
						}
						dispatchers[p].forEach(d => d({ state: proxies[p] }));
						classDispatchers.forEach(d => d({ state: proxiedSelf }));
					} else {
						target[p as keyof typeof target] = newValue;
					}
					return true;
				},
			});

			for (const k in this) {
				if (typeof this[k] === "function") {
					this[k] = this[k].bind(proxiedSelf);
				}
			}

			return proxiedSelf;
		}
	}
};

export const state = (target: any, key: any) => {
	getMeta(target.constructor).push(key);
};

export const observe = <T>(state: T) => {
	const dispatchers = getDispatchers(state);
	if (!dispatchers)
		throw new Error(`value is not an observable state!`);

	const [s, dispatcher] = useState({ state });

	useEffect(() => {
		dispatchers.push(dispatcher);
		return () => {
			const index = dispatchers.indexOf(dispatcher);
			if (index > -1)
				dispatchers.splice(index, 1);
		}
	}, []);

	return s.state;
};
