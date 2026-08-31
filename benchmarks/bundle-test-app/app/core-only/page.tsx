'use client';

import { configureConsentManager, createConsentManagerStore } from '@c15t/core';
import { useEffect, useState } from 'react';

const CoreOnlyPage = () => {
	const [consents, setConsents] = useState<Record<string, boolean>>({});
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const manager = configureConsentManager({ mode: 'offline' });
		const store = createConsentManagerStore(manager);
		const frame = requestAnimationFrame(() => {
			setConsents(store.getState().consents);
			setIsLoading(false);
		});

		// Subscribe to changes
		const unsubscribe = store.subscribe((state) => {
			setConsents(state.consents);
		});

		return () => {
			cancelAnimationFrame(frame);
			unsubscribe();
		};
	}, []);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Core Only Test</h1>
			<p>
				This page uses only the vanilla JS core package (c15t) without React
				bindings.
			</p>

			<h2>Current Consents</h2>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
		</main>
	);
};

export default CoreOnlyPage;
