'use client';

import {
	type ConsentManagerProviderProps,
	useConsentManager,
} from '@c15t/react';
import { useEffect } from 'react';

/**
 * This component is used to provide options to the consent manager on the client side.
 * It is used to avoid issues with server-side rendering in Next.js App Directory.
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
	const { setCallback, addScripts } = useConsentManager();

	useEffect(() => {
		if (!callbacks) {
			return;
		}

		for (const [key, value] of Object.entries(callbacks) as [
			keyof typeof callbacks,
			(typeof callbacks)[keyof typeof callbacks],
		][]) {
			setCallback(key, value);
		}
	}, [callbacks, setCallback]);

	useEffect(() => {
		if (!scripts) {
			return;
		}

		addScripts(scripts);
	}, [scripts, addScripts]);

	return { children };
}
