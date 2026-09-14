import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsManifestBenchmarkProvider } from '../_bench/provider';

const ManifestSSRLayout = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({
		backendURL: '/api/c15t',
		manifestURL: '/api/c15t/manifest',
	});

	return (
		<NextjsManifestBenchmarkProvider
			state={state}
			scenario="manifest-ssr"
		>
			{children}
		</NextjsManifestBenchmarkProvider>
	);
};

export default ManifestSSRLayout;
