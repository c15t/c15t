'use client';

import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';

const BannerOnlyPage = () => (
	<ConsentManagerProvider options={{ mode: 'offline' }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Banner Only Test</h1>
			<p>This page only imports the ConsentBanner component.</p>
			<p>The banner should appear at the bottom of the page.</p>
		</main>
		<ConsentBanner />
	</ConsentManagerProvider>
);

export default BannerOnlyPage;
