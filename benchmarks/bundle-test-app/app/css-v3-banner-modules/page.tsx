'use client';

import { ConsentBanner } from '@c15t/react/v3/consent-banner';
import { ConsentProvider } from '@c15t/react/v3/provider';

const CssV3BannerModulesPage = () => {
	return (
		<ConsentProvider options={{ mode: 'offline' }}>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React v3 Banner + CSS Modules Benchmark</h1>
			</main>
			<ConsentBanner />
		</ConsentProvider>
	);
};

export default CssV3BannerModulesPage;
