'use client';

import '@c15t/react/styles.css';
import '@c15t/react/iab/styles.css';
import { ConsentManagerProvider } from '@c15t/react';
import { IABConsentDialog } from '@c15t/react/iab';

const CssV2IabMonolithPage = () => (
	<ConsentManagerProvider options={{ mode: 'offline' }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React v2 IAB + Monolith CSS Benchmark</h1>
		</main>
		<IABConsentDialog />
	</ConsentManagerProvider>
);

export default CssV2IabMonolithPage;
