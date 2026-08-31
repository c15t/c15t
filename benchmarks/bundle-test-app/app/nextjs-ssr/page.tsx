'use client';

import { ConsentBanner } from '@c15t/react/components/consent-banner';

const NextjsSSRPage = () => {
	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>Next.js SSR Benchmark</h1>
			<ConsentBanner />
		</main>
	);
};

export default NextjsSSRPage;
