export type ObservableListener = (key: PropertyKey, value: unknown) => void;

export type ObservableState = {
	proxy: object;
	tracked: Set<PropertyKey>;
	trackNewProperties: boolean;
	listeners: Set<ObservableListener>;
	keyedListeners: Map<PropertyKey, Set<ObservableListener>>;
};

export type ObservableDependencies = Map<ObservableState, Set<PropertyKey>>;

const STATES = new WeakMap<object, ObservableState>();

let activeDependencies: ObservableDependencies | undefined;

export const getObservableState = (value: object): ObservableState | undefined => STATES.get(value);

export const registerObservableState = (target: object, proxy: object, state: ObservableState): void => {
	STATES.set(target, state);
	STATES.set(proxy, state);
};

export const trackObservableRead = (state: ObservableState, key: PropertyKey): void => {
	if (!activeDependencies)
		return;

	let keys = activeDependencies.get(state);

	if (!keys)
		activeDependencies.set(state, keys = new Set());

	keys.add(key);
};

export const collectObservableDependencies = <T>(callback: () => T): { value: T; dependencies: ObservableDependencies } => {
	const previous = activeDependencies;
	const dependencies: ObservableDependencies = new Map();

	activeDependencies = dependencies;

	try {
		return { value: callback(), dependencies };
	} finally {
		activeDependencies = previous;
	}
};

export const subscribeObservableDependency = (state: ObservableState, key: PropertyKey, listener: ObservableListener): (() => void) => {
	let listeners = state.keyedListeners.get(key);

	if (!listeners)
		state.keyedListeners.set(key, listeners = new Set());

	listeners.add(listener);

	return () => {
		listeners?.delete(listener);

		if (listeners?.size === 0)
			state.keyedListeners.delete(key);
	};
};

export const notifyObservableKey = (state: ObservableState, key: PropertyKey, value: unknown): void => {
	for (const listener of [...(state.keyedListeners.get(key) ?? [])])
		listener(key, value);
};

export const notifyObservable = (state: ObservableState, key: PropertyKey, value: unknown): void => {
	notifyObservableKey(state, key, value);

	for (const listener of [...state.listeners])
		listener(key, value);
};