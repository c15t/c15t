'use client';

import type { ConsentManagerOptions } from '@c15t/react';

import { env } from './env';

/**
 * Create configuration options for React components to use
 *
 * These options configure access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const manager: ConsentManagerOptions = {
	mode: 'c15t',
	backendURL: env.NEXT_PUBLIC_C15T_URL as string,
	store: {
		initialGdprTypes: ['necessary', 'marketing'],
	},
};
