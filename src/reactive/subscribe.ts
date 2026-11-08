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

	const listener: ObservableListener = () => {
		handler(Reflect.get(state.proxy, keyOrHandler), keyOrHandler);
	};

	listeners.add(listener);

	return () => {
		listeners?.delete(listener);

		if (listeners?.size === 0)
			state.keyedListeners.delete(keyOrHandler);
	};
}) as Subscriber;


export const subscribeDeep: DeepSubscriber = ((observable: object, handler: SubscribeHandler<any>) => {
	const rootState = getObservableState(observable);

	if (!rootState)
		throw new TypeError("Cannot subscribe to a value that is not observable.");

	const subscriptions = new Map<object, Unsubscriber>();

	let disposed = false;

	const refresh = (): void => {
		for (const unsubscribe of subscriptions.values())
			unsubscribe();

		subscriptions.clear();

		const visited = new Set<object>();

		const visit = (value: unknown): void => {
			if (typeof value !== "object" || value === null)
				return;

			const state = getObservableState(value);

			if (!state || visited.has(state.proxy))
				return;

			visited.add(state.proxy);

			subscriptions.set(state.proxy, subscribe(state.proxy, () => {
				handler(rootState.proxy);
				refresh();
			}));

			for (const key of Reflect.ownKeys(state.proxy))
				visit(Reflect.get(state.proxy, key));
		};

		visit(rootState.proxy);
	};

	refresh();

	return () => {
		if (disposed)
			return;

		disposed = true;

		for (const unsubscribe of subscriptions.values())
			unsubscribe();

		subscriptions.clear();
	};
}) as DeepSubscriber;

export interface DeepSubscriber {
	<T extends object>(observable: T, handler: SubscribeHandler<T>): Unsubscriber;
}

export interface Subscriber {
	<T extends object, K extends keyof T>(observable: T, key: K, handler: SubscribeHandlerWithKey<T[K], K>): Unsubscriber;
	<T extends object>(observable: T, handler: SubscribeHandler<T>): Unsubscriber;
}

export type Unsubscriber = () => void;

export type SubscribeHandler<T> = (value: T) => unknown;
export type SubscribeHandlerWithKey<T, K> = (value: T, key: K) => unknown;