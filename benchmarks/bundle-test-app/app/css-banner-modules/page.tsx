'use client';

import { offline } from '@c15t/react';
import { ConsentBanner } from '@c15t/react/consent-banner';
import { ConsentProvider } from '@c15t/react/provider';

const CssBannerModulesPage = () => (
	<ConsentProvider options={{ mode: offline() }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Banner + CSS Modules Benchmark</h1>
		</main>
		<ConsentBanner />
	</ConsentProvider>
);

export default CssBannerModulesPage;
