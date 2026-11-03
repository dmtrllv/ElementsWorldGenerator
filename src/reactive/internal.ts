export type ObservableListener = (key: PropertyKey, value: unknown) => void;

export type ObservableState = {
	proxy: object;
	tracked: Set<PropertyKey>;
	trackNewProperties: boolean;
	listeners: Set<ObservableListener>;
	keyedListeners: Map<PropertyKey, Set<ObservableListener>>;
};

const STATES = new WeakMap<object, ObservableState>();

export const getObservableState = (value: object): ObservableState | undefined => STATES.get(value);

export const registerObservableState = (target: object, proxy: object, state: ObservableState): void => {
	STATES.set(target, state);
	STATES.set(proxy, state);
};

export const notifyObservable = (state: ObservableState, key: PropertyKey, value: unknown): void => {
	const keyedListeners = [...(state.keyedListeners.get(key) ?? [])];
	for (const listener of keyedListeners)
		listener(key, value);
	for (const listener of [...state.listeners])
		listener(key, value);
};