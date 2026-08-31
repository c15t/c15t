'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	ConsentWidget,
	useConsentManager,
} from '@c15t/react';

const TestComponent = () => {
	const { consents, saveConsents } = useConsentManager();
	return (
		<div>
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
const ReactFullPage = () => (
	<ConsentManagerProvider options={{ mode: 'offline' }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Full Benchmark</h1>
			<p>This route imports the full React consent experience.</p>
			<TestComponent />
		</main>
		<ConsentBanner />
		<ConsentDialog />
		<ConsentWidget />
	</ConsentManagerProvider>
);

export default ReactFullPage;
