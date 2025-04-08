'use client';

import { ConsentManagerOptions } from "@c15t/react";

/**
 * Create a client for React components to use
 *
 * This client provides access to the c15t consent management system
 * and exposes hooks and utilities for consent management.
 */
export const c15tOptions: ConsentManagerOptions = {
	backendURL: 'http://localhost:8787/api/c15t',
  store: {
    initialGdprTypes: ['necessary', 'marketing'],
  }
}
