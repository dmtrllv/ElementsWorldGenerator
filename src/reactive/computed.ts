import { getObservableState, collectObservableDependencies, notifyObservableKey, subscribeObservableDependency, type ObservableListener } from "./internal";

type ComputedEntry = {
	value: unknown;
	dirty: boolean;
	computing: boolean;
	unsubscribers: (() => void)[];
};

export interface ComputedDecorator {
	(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor | void;
}

export const computed: ComputedDecorator = (_target, key, descriptor) => {
	const getter = descriptor.get;

	if (!getter)
		throw new TypeError(`@computed can only decorate getters: ${String(key)}`);

	const cache = new WeakMap<object, ComputedEntry>();

	descriptor.get = function(this: object) {
		// During construction, the instance has not been wrapped in its observable proxy yet.
		if (!getObservableState(this))
			return getter.call(this);

		let entry = cache.get(this);

		if (entry && !entry.dirty) {
			if (entry.computing)
				throw new Error(`Circular computed dependency detected: ${String(key)}`);

			return entry.value;
		}

		if (entry) {
			for (const unsubscribe of entry.unsubscribers)
				unsubscribe();

			entry.unsubscribers = [];
		} else {
			entry = {
				value: undefined,
				dirty: true,
				computing: false,
				unsubscribers: []
			};

			cache.set(this, entry);
		}

		entry.computing = true;

		try {
			const result = collectObservableDependencies(() => getter.call(this));

			entry.value = result.value;
			entry.dirty = false;
			entry.computing = false;

			const invalidate: ObservableListener = () => {
				if (entry!.dirty)
					return;

				entry!.dirty = true;

				for (const unsubscribe of entry!.unsubscribers)
					unsubscribe();

				entry!.unsubscribers = [];

				const state = getObservableState(this);

				if (state)
					notifyObservableKey(state, key, undefined);
			};

			for (const [state, keys] of result.dependencies) {
				for (const dependency of keys)
					entry.unsubscribers.push(subscribeObservableDependency(state, dependency, invalidate));
			}

			return entry.value;
		} catch (error) {
			entry.computing = false;

			for (const unsubscribe of entry.unsubscribers)
				unsubscribe();

			cache.delete(this);

			throw error;
		}
	};

	return descriptor;
};