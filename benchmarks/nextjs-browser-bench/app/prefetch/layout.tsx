import { C15tPrefetch } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import { NextjsBenchmarkProvider } from '../_bench/provider';

export default function PrefetchLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<C15tPrefetch backendURL="/api/bench-consent" />
			<NextjsBenchmarkProvider scenario="prefetch">
				{children}
			</NextjsBenchmarkProvider>
		</>
	);
}
