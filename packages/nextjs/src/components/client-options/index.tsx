'use client';

import {
	type ConsentManagerProviderProps,
	useConsentManager,
} from '@c15t/react';
import { useEffect, useRef } from 'react';

export type ClientSideOptionsProviderProps = {
	children: React.ReactNode;
	callbacks?: ConsentManagerProviderProps['options']['callbacks'];
	scripts?: ConsentManagerProviderProps['options']['scripts'];
};

/**
 * This component is used to provide options to the consent manager on the client side.
 * This is seperate from the ConsentManagerProvider component because options like callbacks and scripts can't be seralized.
 * If you want a fully client-side solution, you can use the <ConsentManagerProvider /> component from @c15t/nextjs/client.
 *
 * @param children - The children to render.
 * @param callbacks - The callbacks to set.
 * @param scripts - The scripts to load.
 *
 * @remarks
 * This component performs one-time initialization on mount. Callbacks and scripts are captured
 * once when the component first mounts and are not updated on subsequent prop changes. This
 * ensures stable behavior and prevents inconsistent state in the consent manager.
 * You can pass inline objects without needing to wrap them in useMemo.
 */
export function ClientSideOptionsProvider({
	children,
	callbacks,
	scripts,
}: ClientSideOptionsProviderProps) {
	const { setCallback, setScripts } = useConsentManager();

	// Capture initial values of callbacks and scripts for one-time initialization
	const callbacksRef = useRef(callbacks);
	const scriptsRef = useRef(scripts);

	// Track if we've initialized to only set once
	const initializedRef = useRef({ callbacks: false, scripts: false });

	// Set callbacks only once on mount
	useEffect(() => {
		if (initializedRef.current.callbacks || !callbacksRef.current) {
			return;
		}

		for (const [key, value] of Object.entries(callbacksRef.current)) {
			const callbackKey = key as keyof typeof callbacksRef.current;
			setCallback(callbackKey, value);
		}

		initializedRef.current.callbacks = true;
	}, [setCallback]); // setCallback is stable from the store

	// Set scripts only once on mount
	useEffect(() => {
		if (initializedRef.current.scripts || !scriptsRef.current) {
			return;
		}

		setScripts(scriptsRef.current);
		initializedRef.current.scripts = true;
	}, [setScripts]); // setScripts is stable from the store

	return children;
}
