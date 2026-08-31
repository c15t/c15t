'use client';

import { ConsentBanner } from '@c15t/react/components/consent-banner';

const NextjsSSRPage = () => (
	<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
		<h1>Next.js SSR Benchmark</h1>
		<ConsentBanner />
	</main>
);

export default NextjsSSRPage;
