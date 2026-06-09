'use client';

import { ConsentManagerProvider } from '@c15t/react';
import type { ReactNode } from 'react';

/**
 * Provider for the /terms dev page. Talks to this app's own self-host
 * backend route, which is configured with the demo legal-document release.
 */
export function TermsProvider({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				backendURL: '/api/self-host',
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
