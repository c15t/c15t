import { consentLoaderOptions } from '@c15t/tanstack-start/server';
import { createFileRoute } from '@tanstack/react-router';

import { getDirectInitConsentState } from '../bench/loaders';
import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackPrefetchedBenchmarkProvider } from '../bench/provider';

const SSRPage = () => {
	// oxlint-disable-next-line no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
	const state = Route.useLoaderData();

	return (
		<TanstackPrefetchedBenchmarkProvider
			state={state}
			scenario="ssr"
		>
			<BenchmarkPageShell scenario="ssr" />
		</TanstackPrefetchedBenchmarkProvider>
	);
};

export const Route = createFileRoute('/ssr')({
	...consentLoaderOptions,
	component: SSRPage,
	loader: () => getDirectInitConsentState(),
});
