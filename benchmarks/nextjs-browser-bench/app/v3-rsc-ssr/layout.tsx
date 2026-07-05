import { RscConsentBanner } from '@c15t/nextjs/v3/rsc';
import { prefetchInitialConsent } from '@c15t/nextjs/v3/server';
import type { ReactNode } from 'react';
import { NextjsV3ManifestBenchmarkProvider } from '../_bench/v3-provider';

/**
 * RSC-first arm: manifest-prefetched init + the banner rendered as a Server
 * Component (shell markup never enters the client bundle; only the gate and
 * action-button islands hydrate). Compare against `v3-manifest-ssr`, which
 * is identical except the banner is the fully client-hydrated component.
 */
export default async function V3RscSSRLayout({
	children,
}: {
	children: ReactNode;
}) {
	const config = await prefetchInitialConsent({
		backendURL: '/api/c15t',
		manifestURL: '/api/c15t/manifest',
	});

	return (
		<NextjsV3ManifestBenchmarkProvider
			config={config}
			scenario="nextjs-v3-rsc-ssr"
			surfaces="none"
		>
			<RscConsentBanner config={config} />
			{children}
		</NextjsV3ManifestBenchmarkProvider>
	);
}
