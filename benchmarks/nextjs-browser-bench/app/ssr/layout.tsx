import { fetchInitialData } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import { NextjsBenchmarkProvider } from '../_bench/provider';

export default function SSRLayout({ children }: { children: ReactNode }) {
	const ssrData = fetchInitialData({
		backendURL: '/api/bench-consent',
		nextCache: {
			revalidateSeconds: false,
		},
	});

	return (
		<NextjsBenchmarkProvider scenario="ssr" ssrData={ssrData}>
			{children}
		</NextjsBenchmarkProvider>
	);
}
