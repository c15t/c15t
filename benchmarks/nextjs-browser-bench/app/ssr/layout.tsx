import { prefetchInitialConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsPrefetchedBenchmarkProvider } from '../_bench/provider';

const SSRLayout = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: '/api/bench-consent',
	});

	return (
		<NextjsPrefetchedBenchmarkProvider
			config={config}
			scenario="ssr"
		>
			{children}
		</NextjsPrefetchedBenchmarkProvider>
	);
};

export default SSRLayout;
