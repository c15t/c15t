/**
 * Browser Test Setup for Vitest
 *
 * This file runs in the browser before tests start.
 * It sets up mock GVL for IAB tests.
 */

import type * as Core from '@c15t/core';
import type { RevocationReloadOptions } from '@c15t/core';
import { vi } from 'vitest';

import { mockGVL } from './components/iab/__tests__/fixtures/mock-consent-state';

// Revoking consent reloads the page by default. A real reload restarts the
// test iframe, so tests get a no-op reload instead.
// oxlint-disable-next-line anti-slop/no-module-mocking -- `window.location.reload` cannot be replaced in a real browser. The factory returns the real module with only the reload swapped.
vi.mock('@c15t/core', async (importOriginal) => {
	const actual = await importOriginal<typeof Core>();
	return {
		...actual,
		watchRevocationReload: (options: RevocationReloadOptions) =>
			actual.watchRevocationReload({ reload: () => undefined, ...options }),
	};
});

// Set mock GVL on window immediately (before any other code runs)
// This is picked up by the bundled core code's fetchGVL function
if (typeof window !== 'undefined') {
	(window as unknown as { __c15t_mock_gvl?: typeof mockGVL }).__c15t_mock_gvl =
		mockGVL;

	console.log('[test-setup.browser] Mock GVL set on window');
}
