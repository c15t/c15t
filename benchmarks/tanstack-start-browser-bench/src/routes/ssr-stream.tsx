import { consentLoaderOptions } from '@c15t/tanstack-start/server';
import { createFileRoute } from '@tanstack/react-router';

import { getDirectInitConsentState } from '../bench/loaders';
import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackPrefetchedBenchmarkProvider } from '../bench/provider';
import { consentStylesheetHead } from '../bench/stylesheets';

const SSRStreamPage = () => {
	// oxlint-disable-next-line no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
	const { consent } = Route.useLoaderData();

	return (
		<TanstackPrefetchedBenchmarkProvider
			state={consent}
			scenario="ssr-stream"
		>
			<BenchmarkPageShell scenario="ssr-stream" />
		</TanstackPrefetchedBenchmarkProvider>
	);
};

/**
 * The streamed setup `ConsentRoot` documents: the loader returns the
 * consent state unawaited, so the response starts without waiting for the
 * backend and the router streams the state in after the shell. The server
 * HTML has no banner; it shows once the state reaches the hydrated root.
 */
export const Route = createFileRoute('/ssr-stream')({
	...consentLoaderOptions,
	component: SSRStreamPage,
	head: consentStylesheetHead,
	loader: () => ({ consent: getDirectInitConsentState() }),
});
