'use client';

import {
	type ConsentManagerProviderProps,
	useConsentManager,
} from '@c15t/react';
import { useEffect } from 'react';

/**
 * This component is used to provide options to the consent manager on the client side.
 * This is seperate from the ConsentManagerProvider component because options like callbacks and scripts can't be seralized.
 * If you want a fully client-side solution, you can use the <ConsentManagerProvider /> component from @c15t/nextjs/client.
 *
 * @param children - The children to render.
 * @param callbacks - The callbacks to set.
 * @param scripts - The scripts to load.
 */
export function ClientSideOptionsProvider({
	children,
	callbacks,
	scripts,
}: {
	children: React.ReactNode;
	callbacks?: ConsentManagerProviderProps['options']['callbacks'];
	scripts?: ConsentManagerProviderProps['options']['scripts'];
}) {
	const { setCallback, setScripts } = useConsentManager();

	useEffect(() => {
		if (!callbacks) {
			return;
		}

		for (const [key, value] of Object.entries(callbacks)) {
			setCallback(key as keyof typeof callbacks, value);
		}
	}, [callbacks, setCallback]);

	useEffect(() => {
		if (!scripts) {
			return;
		}

		setScripts(scripts);
	}, [scripts, setScripts]);

	return children;
}
