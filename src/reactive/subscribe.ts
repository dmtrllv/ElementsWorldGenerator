import { getObservableState, type ObservableListener } from "./internal";

export const subscribe: Subscriber = ((observable: object, keyOrHandler: PropertyKey | SubscribeHandler<any>, handler?: SubscribeHandlerWithKey<any, any>) => {
	const state = getObservableState(observable);

	if (!state) 
		throw new TypeError("Cannot subscribe to a value that is not observable.");

	if (typeof keyOrHandler === "function") {
		const listener: ObservableListener = () => keyOrHandler(state.proxy);

		state.listeners.add(listener);

		return () => state.listeners.delete(listener);
	}

	if (typeof handler !== "function") 
		throw new TypeError("A property subscription requires a handler.");

	let listeners = state.keyedListeners.get(keyOrHandler);

	if (!listeners) 
		state.keyedListeners.set(keyOrHandler, listeners = new Set());

	const listener: ObservableListener = (key, value) => {
		if (key === keyOrHandler) 
			handler(value, keyOrHandler);
	};

	listeners.add(listener);

	return () => {
		listeners?.delete(listener);

		if (listeners?.size === 0) 
			state.keyedListeners.delete(keyOrHandler);
	};
}) as Subscriber;

export interface Subscriber {
	<T extends object, K extends keyof T>(observable: T, key: K, handler: SubscribeHandlerWithKey<T[K], K>): Unsubscriber;
	<T extends object>(observable: T, handler: SubscribeHandler<T>): Unsubscriber;
}

export type Unsubscriber = () => void;

export type SubscribeHandler<T> = (value: T) => unknown;
export type SubscribeHandlerWithKey<T, K> = (value: T, key: K) => unknown;