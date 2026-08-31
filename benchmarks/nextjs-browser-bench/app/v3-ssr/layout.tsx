import { fetchInitialData } from '@c15t/nextjs/v3';
import { prefetchInitialConsent } from '@c15t/nextjs/v3/server';
import type { ReactNode } from 'react';

import { NextjsV3PrefetchedBenchmarkProvider } from '../_bench/v3-provider';

const V3SSRLayout = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: '/api/bench-consent',
	});
	const ssrData = fetchInitialData({
		backendURL: '/api/bench-consent',
		nextCache: {
			revalidateSeconds: false,
		},
	});

	return (
		<NextjsV3PrefetchedBenchmarkProvider
			config={config}
			scenario="nextjs-v3-ssr"
			ssrData={ssrData}
		>
			{children}
		</NextjsV3PrefetchedBenchmarkProvider>
	);
};

export default V3SSRLayout;
