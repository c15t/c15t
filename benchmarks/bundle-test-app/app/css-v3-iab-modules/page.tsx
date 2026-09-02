'use client';

import { offline } from '@c15t/react/v3';
import { IABConsentDialog } from '@c15t/react/v3/iab';
import { ConsentProvider } from '@c15t/react/v3/provider';

const CssV3IabModulesPage = () => (
	<ConsentProvider options={{ mode: offline() }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React v3 IAB + CSS Modules Benchmark</h1>
		</main>
		<IABConsentDialog />
	</ConsentProvider>
);

export default CssV3IabModulesPage;
