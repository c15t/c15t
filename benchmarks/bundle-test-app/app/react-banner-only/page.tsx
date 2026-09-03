'use client';

import { offline } from '@c15t/react';
import { ConsentBanner } from '@c15t/react/components/consent-banner';
import { ConsentProvider } from '@c15t/react/provider';

const ReactBannerOnlyPage = () => (
	<ConsentProvider options={{ mode: offline() }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Banner Only Benchmark</h1>
			<p>This route isolates the consent banner component.</p>
		</main>
		<ConsentBanner />
	</ConsentProvider>
);

export default ReactBannerOnlyPage;
