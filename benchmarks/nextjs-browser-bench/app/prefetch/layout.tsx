import { C15tPrefetch } from '@c15t/nextjs';
import type { ReactNode } from 'react';

import { NextjsBenchmarkProvider } from '../_bench/provider';

const PrefetchLayout = ({ children }: { children: ReactNode }) => (
	<>
		<C15tPrefetch backendURL="/api/bench-consent" />
		<NextjsBenchmarkProvider scenario="prefetch">
			{children}
		</NextjsBenchmarkProvider>
	</>
);

export default PrefetchLayout;
