import type { ReactNode } from 'react';

import { NextjsBenchmarkProvider } from '../_bench/provider';

const ClientLayout = ({ children }: { children: ReactNode }) => {
	return (
		<NextjsBenchmarkProvider scenario="client">
			{children}
		</NextjsBenchmarkProvider>
	);
};

export default ClientLayout;
