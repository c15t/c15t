'use client';

import '@c15t/react/styles.css';

import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';

export default function CssV2BannerMonolithPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React v2 Banner + Monolith CSS Benchmark</h1>
			</main>
			<ConsentBanner />
		</ConsentManagerProvider>
	);
}
