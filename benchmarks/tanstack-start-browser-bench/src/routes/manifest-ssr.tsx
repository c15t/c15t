import { consentLoaderOptions } from '@c15t/tanstack-start/server';
import type { ConsentConfig } from '@c15t/tanstack-start/server';
import { createFileRoute } from '@tanstack/react-router';

import { getManifestConsentConfig } from '../bench/loaders';
import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackManifestBenchmarkProvider } from '../bench/provider';

/**
 * Inlined by Vite at build time. When the root route mounts the provider
 * (`C15T_BENCH_ROOT_PROVIDER=1`, see `src/bench/root-shell-provider.tsx`)
 * this route renders only
 * the page shell, with no loader and no provider of its own.
 */
const ROOT_PROVIDER = import.meta.env.C15T_BENCH_ROOT_PROVIDER === '1';

const ManifestSSRPage = () => {
	// oxlint-disable-next-line no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
	const config = Route.useLoaderData() as ConsentConfig;

	if (ROOT_PROVIDER) {
		return <BenchmarkPageShell scenario="manifest-ssr-root" />;
	}

	return (
		<TanstackManifestBenchmarkProvider
			config={config}
			scenario="manifest-ssr"
		>
			<BenchmarkPageShell scenario="manifest-ssr" />
		</TanstackManifestBenchmarkProvider>
	);
};

const routeConsentOptions = ROOT_PROVIDER
	? {}
	: { ...consentLoaderOptions, loader: () => getManifestConsentConfig() };

export const Route = createFileRoute('/manifest-ssr')({
	...routeConsentOptions,
	component: ManifestSSRPage,
});
