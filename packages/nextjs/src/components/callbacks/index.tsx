'use client';

import {
	type ConsentManagerProviderProps,
	useConsentManager,
} from '@c15t/react';
import { useEffect } from 'react';

export function ConsentManagerCallbacks({
	callbacks,
}: {
	callbacks: ConsentManagerProviderProps['options']['callbacks'];
}) {
	const { setCallback } = useConsentManager();

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

	return null;
}
