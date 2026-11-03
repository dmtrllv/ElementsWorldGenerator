export const observable: ObservableDecorator = (configOrTarget: any, key?: any) => {
	if (key !== undefined) {
		// property decorator
	} else {
		// class decorator with optional config (check if configOrTarget)
	}
	throw new Error("Not implemented!");
};

// makes a regular object observable
export const createObservable = <T extends object>(value: T): T => {
	throw new Error("Not implemented!");
};

export interface ObservableDecorator {
	<T extends new (...args: any[]) => any>(config: ObservableConfig): (target: T) => any;
	<T extends new (...args: any[]) => any>(target: T): any;
	<T extends object>(target: T, key: keyof T): any;
}

export type ObservableConfig = {
	inherit: boolean;
	auto: boolean;
};