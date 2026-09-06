import { prefetchInitialConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsManifestBenchmarkProvider } from '../_bench/provider';

const ManifestSSRLayout = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: '/api/c15t',
		manifestURL: '/api/c15t/manifest',
	});

	return (
		<NextjsManifestBenchmarkProvider
			config={config}
			scenario="manifest-ssr"
		>
			{children}
		</NextjsManifestBenchmarkProvider>
	);
};

export default ManifestSSRLayout;
