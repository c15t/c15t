import { C15tPrefetch } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import { BenchmarkConsentProvider } from '../_components/consent-provider';
import { BENCHMARK_BACKEND_URL } from '../_components/constants';

export default function PrefetchBenchmarkLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			{/* beforeInteractive runs pre-hydration; App Router may serialize it via __next_s bootstrap output. */}
			<C15tPrefetch backendURL={BENCHMARK_BACKEND_URL} />
			<BenchmarkConsentProvider variant="prefetch">
				{children}
			</BenchmarkConsentProvider>
		</>
	);
}
