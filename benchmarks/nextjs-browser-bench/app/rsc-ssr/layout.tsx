import { RscConsentBanner } from '@c15t/nextjs/rsc';
import { prefetchInitialConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsManifestBenchmarkProvider } from '../_bench/provider';

/**
 * RSC-first arm: manifest-prefetched init + a Server Component banner. Only
 * the gate and action-button islands hydrate. Compare against `manifest-ssr`,
 * where the banner is fully client-hydrated.
 */
const RscSSRLayout = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: '/api/c15t',
		manifestURL: '/api/c15t/manifest',
	});

	return (
		<NextjsManifestBenchmarkProvider
			config={config}
			scenario="rsc-ssr"
			surfaces="none"
		>
			<RscConsentBanner config={config} />
			{children}
		</NextjsManifestBenchmarkProvider>
	);
};

export default RscSSRLayout;
