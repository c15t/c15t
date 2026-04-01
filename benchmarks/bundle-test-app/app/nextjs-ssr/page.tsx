'use client';

import { ConsentBanner } from '@c15t/react/components/consent-banner';

export default function NextjsSSRPage() {
	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>Next.js SSR Benchmark</h1>
			<ConsentBanner />
		</main>
	);
}
