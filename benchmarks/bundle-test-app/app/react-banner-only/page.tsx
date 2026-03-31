'use client';

import { ConsentBanner } from '@c15t/react/components/consent-banner';
import { ConsentManagerProvider } from '@c15t/react/headless';

export default function ReactBannerOnlyPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React Banner Only Benchmark</h1>
				<p>This route isolates the consent banner component.</p>
			</main>
			<ConsentBanner />
		</ConsentManagerProvider>
	);
}
