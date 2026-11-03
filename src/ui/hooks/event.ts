import { useEffect, useRef } from "react";

export const useEvent = <K extends keyof WindowEventMap>(type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void => {
	const listenerRef = useRef(listener);

	useEffect(() => {
		listenerRef.current = listener;
	});

	useEffect(() => {
		const handler = (event: WindowEventMap[K]) => listenerRef.current.call(window, event);

		window.addEventListener(type, handler, options);

		return () => window.removeEventListener(type, handler, options);
	}, [type, options]);
};