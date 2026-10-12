'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentManagerProvider,
} from '@c15t/nextjs';
import type { ReactNode } from 'react';

import { theme } from './theme';

/**
 * The v2 Next.js quickstart provider in hosted mode, with the same custom
 * theme and categories as the v3 arms and a persistent preferences link.
 */
export const ConsentManager = ({ children }: { children: ReactNode }) => (
	<ConsentManagerProvider
		options={{
			backendURL: '/mock-backend',
			consentCategories: [
				'necessary',
				'functionality',
				'experience',
				'measurement',
				'marketing',
			],
			mode: 'hosted',
			theme,
		}}
	>
		<ConsentBanner />
		<ConsentDialog />
		{children}
		<footer className="mx-auto max-w-3xl px-6 py-8">
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentManagerProvider>
);
