'use client';

import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
	useConsentManager,
} from '@c15t/react';

export default function FullPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>Full Import Test</h1>
				<p>This page imports all components from @c15t/react.</p>
				<TestComponent />
			</main>
			<CookieBanner />
			<ConsentManagerDialog />
		</ConsentManagerProvider>
	);
}

function TestComponent() {
	const { consents, saveConsents } = useConsentManager();
	return (
		<div>
			<h2>Current Consents</h2>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
			<button onClick={() => saveConsents('all')}>Accept All</button>
		</div>
	);
}
