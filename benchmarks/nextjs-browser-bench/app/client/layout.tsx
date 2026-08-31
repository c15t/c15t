import type { ReactNode } from 'react';

import { NextjsBenchmarkProvider } from '../_bench/provider';

const ClientLayout = ({ children }: { children: ReactNode }) => (
	<NextjsBenchmarkProvider scenario="client">
		{children}
	</NextjsBenchmarkProvider>
);

export default ClientLayout;
