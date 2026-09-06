'use client';

import { offline } from '@c15t/react';
import { IABConsentDialog } from '@c15t/react/iab';
import { ConsentProvider } from '@c15t/react/provider';

const CssIabModulesPage = () => (
	<ConsentProvider options={{ mode: offline() }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React IAB + CSS Modules Benchmark</h1>
		</main>
		<IABConsentDialog />
	</ConsentProvider>
);

export default CssIabModulesPage;
