import { useCallback, useRef, useSyncExternalStore } from "react";
import { subscribe } from "./subscribe";

export const useObservable = <T extends object>(observable: T): T => {
	const version = useRef(0);

	const subscribeToObservable = useCallback((onStoreChange: () => void) => {
		return subscribe(observable, () => {
			version.current++;
			onStoreChange();
		});
	}, [observable]);

	const getSnapshot = useCallback(() => version.current, [observable]);

	useSyncExternalStore(subscribeToObservable, getSnapshot);

	return observable;
};