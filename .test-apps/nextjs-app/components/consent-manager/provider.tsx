'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
	type InitialDataPromise,
} from '@c15t/nextjs';
import {
	databuddy,
	linkedinInsights,
	tiktokPixel,
	xPixel,
} from '@c15t/scripts';
import type { ReactNode } from 'react';
/**
 * Client-side consent manager provider
 *
 * This component handles:
 * - Consent state management
 * - Cookie banner and dialog display
 * - Script loading based on consent
 * - SSR data hydration
 *
 * @see https://c15t.com/docs/frameworks/nextjs
 */
export default function ConsentManagerClient({
	children,
	ssrData,
}: {
	children: ReactNode;
	ssrData?: InitialDataPromise;
}) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				ssrData,
				scripts: [
					databuddy({ id: 'YOUR_ID_HERE' }),
					xPixel({ id: 'YOUR_ID_HERE' }),
					tiktokPixel({ id: 'XXXXXXXXXXXXXXXXX' }),
					linkedinInsights({ id: 'YOUR_ID_HERE' }),
				],
				// Add your callbacks here:
				// callbacks: {
				//   onConsentSet: (response) => console.log('Consent updated:', response),
				// },
			}}
		>
			<ConsentBanner />
			<ConsentDialog />
			{children}
		</ConsentManagerProvider>
	);
}
