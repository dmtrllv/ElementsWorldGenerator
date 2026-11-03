export const subscribe: Subscriber = () => {
	throw new Error("Not implemented!");
};

export interface Subscriber {
	<T extends object, K extends keyof T>(observable: T, key: K, handler: SubscribeHandlerWithKey<T[K], K>): Unsubscriber;
	<T extends object>(observable: T, handler: SubscribeHandler<T>): Unsubscriber;
}

export type Unsubscriber = () => void;

export type SubscribeHandler<T> = (value: T) => unknown;
export type SubscribeHandlerWithKey<T, K> = (value: T, key: K) => unknown;