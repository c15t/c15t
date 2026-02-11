import { fetchInitialData } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

export function ConsentManager({ children }: { children: ReactNode }) {
	// We don't need to await this as c15t awaits this promise later when needed
	const ssrData = fetchInitialData({
		backendURL: '/api/self-host',
		// overrides: { country: 'GB', region: 'CA' },
	});

	return (
		<ConsentManagerProvider ssrData={ssrData}>
			{children}
		</ConsentManagerProvider>
	);
}
