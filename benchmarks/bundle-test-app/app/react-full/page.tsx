'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	ConsentWidget,
	useConsentManager,
} from '@c15t/react';

export default function ReactFullPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React Full Benchmark</h1>
				<p>This route imports the full React consent experience.</p>
				<TestComponent />
			</main>
			<ConsentBanner />
			<ConsentDialog />
			<ConsentWidget />
		</ConsentManagerProvider>
	);
}

function TestComponent() {
	const { consents, saveConsents } = useConsentManager();
	return (
		<div>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
			<button onClick={() => saveConsents('all')}>Accept All</button>
		</div>
	);
}
