'use client';

import type { ConsentManagerOptions } from '@c15t/react';

/**
 * Create configuration options for React components to use
 *
 * These options configure access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const c15tOptions: ConsentManagerOptions = {
	backendURL: 'https://consent-io-europe-c15t-examples.c15t.dev/api/c15t',
	store: {
		initialGdprTypes: ['necessary', 'marketing'],
	},
};
