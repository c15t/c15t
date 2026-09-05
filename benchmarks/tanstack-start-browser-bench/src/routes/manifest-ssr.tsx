import { consentLoaderOptions } from '@c15t/tanstack-start/server';
import { createFileRoute } from '@tanstack/react-router';

import { getManifestConsentConfig } from '../bench/loaders';
import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackManifestBenchmarkProvider } from '../bench/provider';

const ManifestSSRPage = () => {
	// oxlint-disable-next-line no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
	const config = Route.useLoaderData();

	return (
		<TanstackManifestBenchmarkProvider
			config={config}
			scenario="manifest-ssr"
		>
			<BenchmarkPageShell scenario="manifest-ssr" />
		</TanstackManifestBenchmarkProvider>
	);
};

export const Route = createFileRoute('/manifest-ssr')({
	...consentLoaderOptions,
	component: ManifestSSRPage,
	loader: () => getManifestConsentConfig(),
});
