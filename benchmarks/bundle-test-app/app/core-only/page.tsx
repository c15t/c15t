'use client';

import { configureConsentManager, createConsentManagerStore } from 'c15t';
import { useEffect, useState } from 'react';

export default function CoreOnlyPage() {
	const [consents, setConsents] = useState<Record<string, boolean>>({});
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const manager = configureConsentManager({ mode: 'offline' });
		const store = createConsentManagerStore(manager);
		setConsents(store.getState().consents);
		setIsLoading(false);

		// Subscribe to changes
		const unsubscribe = store.subscribe((state) => {
			setConsents(state.consents);
		});

		return unsubscribe;
	}, []);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>Core Only Test</h1>
			<p>
				This page uses only the vanilla JS core package (c15t) without React
				bindings.
			</p>

			<h2>Current Consents</h2>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
		</main>
	);
}
