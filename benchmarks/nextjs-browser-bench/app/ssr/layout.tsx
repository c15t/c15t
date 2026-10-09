import { hosted } from '@c15t/nextjs';
import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsPrefetchedBenchmarkProvider } from '../_bench/provider';

const SSRLayout = async ({ children }: { children: ReactNode }) => {
	// The `ssr` arm resolves through the backend's /init on every request,
	// the same hosted mode its ConsentRoot uses. Without `mode`, the server
	// would resolve from the manifest instead.
	const state = await resolveConsent({
		config: { backendURL: '/api/bench-consent', mode: hosted() },
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
