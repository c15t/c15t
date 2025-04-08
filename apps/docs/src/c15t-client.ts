'use client';

import { type ConsentClientOptions, createConsentClient } from '@c15t/react';

import { env } from './env';

/**
 * Create a client for React components to use
 *
 * This client provides access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const c15tClient = createConsentClient({
	backendURL: env.NEXT_PUBLIC_C15T_URL,
} satisfies ConsentClientOptions);
