import { consentLoaderOptions } from '@c15t/tanstack-start/server';
import { createFileRoute } from '@tanstack/react-router';

import { getDirectInitConsentConfig } from '../bench/loaders';
import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackPrefetchedBenchmarkProvider } from '../bench/provider';

const SSRPage = () => {
	// oxlint-disable-next-line no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
	const config = Route.useLoaderData();

	return (
		<TanstackPrefetchedBenchmarkProvider
			config={config}
			scenario="ssr"
		>
			<BenchmarkPageShell scenario="ssr" />
		</TanstackPrefetchedBenchmarkProvider>
	);
};

export const Route = createFileRoute('/ssr')({
	...consentLoaderOptions,
	component: SSRPage,
	loader: () => getDirectInitConsentConfig(),
});
