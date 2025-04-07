'use client';

import { type c15tClientOptions, createConsentClient } from '@c15t/react';

/**
 * Create a client for React components to use
 *
 * This client provides access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const c15tClient = createConsentClient({
	backendURL: 'http://localhost:8787/api/c15t',
	// defaultGdprTypes: ['necessary', 'marketing'],
	// defaultPreferences: {
	// 	analytics: true,
	// 	marketing: true,
	// 	preferences: true,
	// },
	// Note: plugins property removed as it's not in the c15tClientConfig type
} satisfies c15tClientOptions);
