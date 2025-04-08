'use client';

import { type ConsentManagerOptions } from '@c15t/react';

import { env } from './env';

/**
 * Create a client for React components to use
 *
 * This client provides access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const manager: ConsentManagerOptions = {
	backendURL: env.NEXT_PUBLIC_C15T_URL,
	store: {
		initialGdprTypes: ['necessary', 'marketing'],
	},
};
