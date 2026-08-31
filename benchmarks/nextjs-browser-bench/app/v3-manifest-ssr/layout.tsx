import { prefetchInitialConsent } from '@c15t/nextjs/v3/server';
import type { ReactNode } from 'react';

import { NextjsV3ManifestBenchmarkProvider } from '../_bench/v3-provider';

const V3ManifestSSRLayout = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: '/api/c15t',
		manifestURL: '/api/c15t/manifest',
	});

	return (
		<NextjsV3ManifestBenchmarkProvider
			config={config}
			scenario="nextjs-v3-manifest-ssr"
		>
			{children}
		</NextjsV3ManifestBenchmarkProvider>
	);
};

export default V3ManifestSSRLayout;
