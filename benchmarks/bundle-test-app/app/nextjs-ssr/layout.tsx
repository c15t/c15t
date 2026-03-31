import { fetchInitialData } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import { NextjsSSRProvider } from './provider';

export default function NextjsSSRLayout({ children }: { children: ReactNode }) {
	const ssrData = fetchInitialData({
		backendURL: '/api/bench-consent',
		nextCache: {
			revalidateSeconds: false,
		},
	});

	return <NextjsSSRProvider ssrData={ssrData}>{children}</NextjsSSRProvider>;
}
