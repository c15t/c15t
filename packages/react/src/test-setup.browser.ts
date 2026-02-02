/**
 * Browser Test Setup for Vitest
 *
 * This file runs in the browser before tests start.
 * It sets up mock GVL for IAB tests.
 */

import { mockGVL } from './components/iab/__tests__/fixtures/mock-consent-state';

// Set mock GVL on window immediately (before any other code runs)
// This is picked up by the bundled core code's fetchGVL function
(window as unknown as { __c15t_mock_gvl?: typeof mockGVL }).__c15t_mock_gvl =
	mockGVL;

console.log('[test-setup.browser] Mock GVL set on window');
