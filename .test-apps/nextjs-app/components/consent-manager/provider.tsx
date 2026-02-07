'use client';

import type { ReactNode } from 'react';
import { ConsentManagerProvider } from '@c15t/nextjs';
import type { InitialDataPromise } from '@c15t/nextjs';
import ConsentBanner from './consent-banner';
import PreferenceCenter from './preference-center';
import { theme } from './theme';

interface Props {
	children: ReactNode;
	ssrData?: InitialDataPromise;
}

/**
 * Client-side consent manager provider with expanded components
 *
 * This component handles:
 * - Consent state management
 * - Cookie banner display (using compound components)
 * - Preference center dialog (using compound components)
 * - SSR data hydration
 *
 * Customize the appearance by editing:
 * - ./consent-banner.tsx - Banner layout and structure
 * - ./preference-center.tsx - Dialog layout and structure
 * - ./theme.ts - Colors, typography, and styling
 *
 * @see https://c15t.com/docs/frameworks/nextjs/customization
 */
export default function ConsentManagerClient({ children, ssrData }: Props) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				ssrData,
				theme,
				// Add your scripts here:
				// scripts: [
				//   googleTagManager({ id: 'GTM-XXXXXX' }),
				// ],
				// Add your callbacks here:
				// callbacks: {
				//   onConsentSet: (response) => console.log('Consent updated:', response),
				// },
			}}
		>
			<ConsentBanner />
			<PreferenceCenter />
			{children}
		</ConsentManagerProvider>
	);
}
