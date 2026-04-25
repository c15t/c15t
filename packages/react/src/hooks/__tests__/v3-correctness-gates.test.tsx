/**
 * v3 correctness gate — React stale-closure mechanism
 *
 * This reproduces the underlying cause of issue c15t/c15t#604: under
 * React Compiler, `useConsentManager().has('marketing')` returns stale
 * values because the `has` method reference from the Zustand store is
 * stable across state changes. React Compiler sees stable inputs
 * (stable `has` reference + stable literal arg) and caches the
 * computed value forever.
 *
 * The v2 React hook works around this at
 * `packages/react/src/hooks/use-consent-manager.ts:52-84` by manually
 * rebuilding `has()` with `useCallback([consents, policyCategories,
 * policyScopeMode])`, so that the reference changes whenever state
 * changes and React Compiler's cache is invalidated.
 *
 * The v3 React adapter removes the need for a workaround:
 * `useConsent(category)` returns a primitive boolean derived through
 * `useSyncExternalStore`. There is no method reference to cache.
 *
 * This `test.fails` documents the v2 mechanism. When `@c15t/react/v3`
 * ships with selector hooks, add a parallel test that asserts
 * `useConsent('marketing')` returns a fresh value after consent
 * changes, with no useCallback dance required.
 */
import type { ConsentManagerInterface } from 'c15t';
import { createConsentManagerStore } from 'c15t';
import { describe, expect, test, vi } from 'vitest';

const createMockConsentManager = (): ConsentManagerInterface => ({
	showConsentBanner: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
	identifyUser: vi.fn(),
	$fetch: vi.fn(),
});

describe('v3 gate: React stale-closure mechanism (issue #604)', () => {
	test.fails('Zustand `has()` method reference changes when consents change', async () => {
		const manager = createMockConsentManager();
		const store = createConsentManagerStore(manager, {
			initialConsentCategories: ['necessary', 'marketing'],
		});

		const hasBefore = store.getState().has;

		await store.getState().saveConsents('all');

		const hasAfter = store.getState().has;

		// v2: `has` is defined once at store creation; its reference never
		// changes even when the underlying `consents` change. React Compiler
		// sees a stable reference + stable args and caches the derived value,
		// producing stale results until something forces re-derivation.
		//
		// v3: selector hooks return primitive values
		// (e.g. `useConsent('marketing')` → boolean). No method reference to
		// cache. Reference-stability issues disappear structurally.
		expect(hasBefore).not.toBe(hasAfter);
	});
});
