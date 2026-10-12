import type { ReactNode } from 'react';

import { NextjsManifestClientBenchmarkProvider } from '../_bench/provider';

const ManifestClientLayout = ({ children }: { children: ReactNode }) => (
	<NextjsManifestClientBenchmarkProvider scenario="manifest-client">
		{children}
	</NextjsManifestClientBenchmarkProvider>
);

export default ManifestClientLayout;
