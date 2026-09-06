import { consentLoaderOptions } from '@c15t/tanstack-start/server';
import type { ConsentConfig } from '@c15t/tanstack-start/server';
import { Outlet, useLoaderData } from '@tanstack/react-router';

import { BenchDocument } from './document';
import { getManifestConsentConfig } from './loaders';
import { TanstackManifestBenchmarkProvider } from './provider';

/**
 * Root-mounted variant (`C15T_BENCH_ROOT_PROVIDER=1`): the root route runs
 * the manifest prefetch loader and wraps the outlet in `ConsentBoundary`,
 * which is the pattern the adapter docs recommend. Start does not
 * code-split the root route, so the consent chunks join the entry graph
 * instead of hanging off the `/manifest-ssr` component chunk. Only that
 * route is measured in this mode; the other scenario routes still mount
 * their own provider and are not meaningful under it.
 */
export const rootConsentRouteOptions = {
	...consentLoaderOptions,
	loader: () => getManifestConsentConfig(),
};

export const RootComponent = () => {
	// The root match is the closest match while the root component renders.
	const config = useLoaderData({ strict: false }) as ConsentConfig;

	return (
		<BenchDocument>
			<TanstackManifestBenchmarkProvider
				config={config}
				scenario="manifest-ssr-root"
			>
				<Outlet />
			</TanstackManifestBenchmarkProvider>
		</BenchDocument>
	);
};
