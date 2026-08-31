'use client';

import { IABConsentDialog } from '@c15t/react/v3/iab';
import { ConsentProvider } from '@c15t/react/v3/provider';

const CssV3IabModulesPage = () => {
	return (
		<ConsentProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React v3 IAB + CSS Modules Benchmark</h1>
			</main>
			<IABConsentDialog />
		</ConsentProvider>
	);
};

export default CssV3IabModulesPage;
