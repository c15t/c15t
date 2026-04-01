'use client';

import { ConsentBanner } from '@c15t/react/components/consent-banner';
import { ConsentDialog } from '@c15t/react/components/consent-dialog';
import { ConsentWidget } from '@c15t/react/components/consent-widget';
import {
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react/headless';

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
