import { createFileRoute } from '@tanstack/react-router';

import { BenchmarkPageShell } from '../bench/page-shell';
import { TanstackManifestClientBenchmarkProvider } from '../bench/provider';

const ManifestClientPage = () => (
	<TanstackManifestClientBenchmarkProvider scenario="manifest-client">
		<BenchmarkPageShell scenario="manifest-client" />
	</TanstackManifestClientBenchmarkProvider>
);

export const Route = createFileRoute('/manifest-client')({
	component: ManifestClientPage,
	ssr: false,
});
