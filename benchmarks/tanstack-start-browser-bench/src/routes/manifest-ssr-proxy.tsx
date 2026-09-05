import { consentLoaderOptions } from '@c15t/tanstack-start/server';
import { createFileRoute } from '@tanstack/react-router';

import { getManifestConsentConfig } from '../bench/loaders';
import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackManifestBenchmarkProvider } from '../bench/provider';

/**
 * Same prefetch as `manifest-ssr`, but the boundary talks to the proxy
 * mount, so the accept click's `POST /subjects` takes one extra hop
 * through the Start server before it reaches the fixture.
 */
const ManifestSSRProxyPage = () => {
	// oxlint-disable-next-line no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
	const config = Route.useLoaderData();

	return (
		<TanstackManifestBenchmarkProvider
			backendURL="/api/c15t-proxy"
			config={config}
			initRoute="/api/c15t-proxy/init"
			scenario="manifest-ssr-proxy"
		>
			<BenchmarkPageShell scenario="manifest-ssr-proxy" />
		</TanstackManifestBenchmarkProvider>
	);
};

export const Route = createFileRoute('/manifest-ssr-proxy')({
	...consentLoaderOptions,
	component: ManifestSSRProxyPage,
	loader: () => getManifestConsentConfig(),
});
