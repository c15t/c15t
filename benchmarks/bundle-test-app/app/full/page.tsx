'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react';

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
const FullPage = () => (
	<ConsentManagerProvider options={{ mode: 'offline' }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Full Import Test</h1>
			<p>This page imports all components from @c15t/react.</p>
			<TestComponent />
		</main>
		<ConsentBanner />
		<ConsentDialog />
	</ConsentManagerProvider>
);

export default FullPage;
