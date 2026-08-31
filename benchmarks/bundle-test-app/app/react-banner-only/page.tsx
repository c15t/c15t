'use client';

import { ConsentBanner } from '@c15t/react/components/consent-banner';
import { ConsentManagerProvider } from '@c15t/react/headless';

const ReactBannerOnlyPage = () => {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React Banner Only Benchmark</h1>
				<p>This route isolates the consent banner component.</p>
			</main>
			<ConsentBanner />
		</ConsentManagerProvider>
	);
};

export default ReactBannerOnlyPage;
