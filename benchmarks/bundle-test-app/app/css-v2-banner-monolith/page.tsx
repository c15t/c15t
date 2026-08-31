'use client';

import '@c15t/react/styles.css';
import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';

const CssV2BannerMonolithPage = () => (
	<ConsentManagerProvider options={{ mode: 'offline' }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React v2 Banner + Monolith CSS Benchmark</h1>
		</main>
		<ConsentBanner />
	</ConsentManagerProvider>
);

export default CssV2BannerMonolithPage;
