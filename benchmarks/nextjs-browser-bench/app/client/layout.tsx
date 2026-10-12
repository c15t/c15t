import type { ReactNode } from 'react';

import { NextjsClientBenchmarkProvider } from '../_bench/provider';

const ClientLayout = ({ children }: { children: ReactNode }) => (
	<NextjsClientBenchmarkProvider scenario="client">
		{children}
	</NextjsClientBenchmarkProvider>
);

export default ClientLayout;
