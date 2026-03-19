import { fetchInitialData } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import { BenchmarkConsentProvider } from '../_components/consent-provider';
import { BENCHMARK_SSR_BACKEND_URL } from '../_components/constants';

export default function SSRBenchmarkLayout({
	children,
}: {
	children: ReactNode;
}) {
	const ssrData = fetchInitialData({
		backendURL: BENCHMARK_SSR_BACKEND_URL,
		nextCache: {
			revalidateSeconds: false,
		},
	});

	return (
		<BenchmarkConsentProvider variant="ssr" ssrData={ssrData}>
			{children}
		</BenchmarkConsentProvider>
	);
}
