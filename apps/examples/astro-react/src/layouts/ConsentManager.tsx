import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
	type ConsentManagerOptions,
} from '@c15t/react';
import type { ReactNode } from 'react';

/**
 * Create configuration options for React components to use
 *
 * These options configure access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const c15tOptions: ConsentManagerOptions = {
	backendURL: 'http://localhost:8787/api/c15t',
	store: {
		initialGdprTypes: ['necessary', 'marketing'],
	},
};

export const ConsentManagerLayout = ({ children }: { children: ReactNode }) => {
	return (
		<ConsentManagerProvider options={c15tOptions}>
			{children}
			<CookieBanner />
			<ConsentManagerDialog />
		</ConsentManagerProvider>
	);
};
