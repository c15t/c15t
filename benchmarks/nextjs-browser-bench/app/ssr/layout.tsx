import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsPrefetchedBenchmarkProvider } from '../_bench/provider';

const SSRLayout = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({
		backendURL: '/api/bench-consent',
	});

	return (
		<NextjsPrefetchedBenchmarkProvider
			state={state}
			scenario="ssr"
		>
			{children}
		</NextjsPrefetchedBenchmarkProvider>
	);
};

export default SSRLayout;
