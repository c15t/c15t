'use client';

import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';

export default function BannerOnlyPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>Banner Only Test</h1>
				<p>This page only imports the CookieBanner component.</p>
				<p>The banner should appear at the bottom of the page.</p>
			</main>
			<ConsentBanner />
		</ConsentManagerProvider>
	);
}
