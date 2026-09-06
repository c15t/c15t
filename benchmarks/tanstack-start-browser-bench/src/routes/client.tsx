import { createFileRoute } from '@tanstack/react-router';

import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackClientBenchmarkProvider } from '../bench/provider';

const ClientPage = () => (
	<TanstackClientBenchmarkProvider scenario="client">
		<BenchmarkPageShell scenario="client" />
	</TanstackClientBenchmarkProvider>
);

/**
 * `ssr: false`: the provider mounts and runs init in the browser only, the
 * closest Start shape to the Next arm's client-component page.
 */
export const Route = createFileRoute('/client')({
	component: ClientPage,
	ssr: false,
});
