'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react';

const FullPage = () => {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>Full Import Test</h1>
				<p>This page imports all components from @c15t/react.</p>
				<TestComponent />
			</main>
			<ConsentBanner />
			<ConsentDialog />
		</ConsentManagerProvider>
	);
};

const TestComponent = () => {
	const { consents, saveConsents } = useConsentManager();
	return (
		<div>
			<h2>Current Consents</h2>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
			<button
				type="button"
				onClick={() => saveConsents('all')}
			>
				Accept All
			</button>
		</div>
	);
};

export default FullPage;
