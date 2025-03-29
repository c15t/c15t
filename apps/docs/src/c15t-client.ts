'use client';

import { type c15tClientOptions, createConsentClient } from '@c15t/react';

/**
 * Create a client for React components to use
 *
 * This client provides access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const c15tClient = createConsentClient({
	baseURL:
		'https://consent-io-us-east-docs-x.consent-ef4.workers.dev/api/c15t/',
	defaultPreferences: {
		analytics: true,
		marketing: true,
		preferences: true,
	},
	// Note: plugins property removed as it's not in the c15tClientConfig type
} satisfies c15tClientOptions);
