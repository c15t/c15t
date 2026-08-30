'use client';

import '@c15t/react/styles.css';
import '@c15t/react/iab/styles.css';
import { ConsentManagerProvider } from '@c15t/react';
import { IABConsentDialog } from '@c15t/react/iab';

export default function CssV2IabMonolithPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React v2 IAB + Monolith CSS Benchmark</h1>
			</main>
			<IABConsentDialog />
		</ConsentManagerProvider>
	);
}
