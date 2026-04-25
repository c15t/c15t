/**
 * v3 correctness gates
 *
 * Each `test.fails` asserts an invariant the v3 kernel must uphold.
 * Vitest expects these to fail on v2 — they document known bugs that are
 * unfixable without the rewrite. When `c15t/v3` lands, remove `.fails` on
 * the test that now runs against the new kernel path; the assertion then
 * becomes a real correctness gate.
 *
 * See benchmarks/BASELINE.md "Known Correctness Hazards in v2" and
 * .context/plans/critique-c15t-shadow-v3-kernel-first.md for full context.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ConsentManagerInterface } from '../client/client-factory';
import {
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from '../runtime';
import { createConsentManagerStore } from '../store';

const createMockConsentManager = (): ConsentManagerInterface => ({
	showConsentBanner: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
	identifyUser: vi.fn(),
	$fetch: vi.fn(),
});

describe('v3 gate: runtime cache identity', () => {
	afterEach(() => {
		clearConsentRuntimeCache();
	});

	// Gate: two runtime configs that differ only in `overrides` must produce
	// distinct runtimes. v2 silently reuses the first one because
	// generateRuntimeCacheKey (packages/core/src/runtime/index.ts:65-92) does
	// not include `overrides` in the cache key. On Vercel Fluid Compute this
	// leaks consent across concurrent requests. v3 deletes the module cache
	// entirely; adapters memoize at their own boundary.
	test.fails('distinct overrides must yield distinct runtimes', () => {
		const a = getOrCreateConsentRuntime({
			mode: 'offline',
			overrides: { country: 'US', language: 'en' },
		});

		const b = getOrCreateConsentRuntime({
			mode: 'offline',
			overrides: { country: 'DE', language: 'de' },
		});

		// v2: a.consentStore === b.consentStore (silent cache reuse)
		// v3: must be distinct instances
		expect(a.consentStore).not.toBe(b.consentStore);
	});

	// Gate: distinct `callbacks` must yield distinct runtimes. v2 ignores
	// callbacks in the cache key — the React Provider patches this manually
	// at consent-manager-provider.tsx:169-198 with an extra useEffect.
	test.fails('distinct callbacks must yield distinct runtimes', () => {
		const a = getOrCreateConsentRuntime({
			mode: 'offline',
			callbacks: { onConsentSet: vi.fn() },
		});

		const b = getOrCreateConsentRuntime({
			mode: 'offline',
			callbacks: { onConsentSet: vi.fn() },
		});

		expect(a.consentStore).not.toBe(b.consentStore);
	});

	// Gate: distinct `scripts` must yield distinct runtimes. v2 ignores
	// scripts in the cache key too — reusing a runtime means script config
	// changes silently don't apply.
	test.fails('distinct scripts must yield distinct runtimes', () => {
		const a = getOrCreateConsentRuntime({
			mode: 'offline',
			scripts: [
				{ id: 's1', src: 'https://a.example/a.js', category: 'marketing' },
			],
		});

		const b = getOrCreateConsentRuntime({
			mode: 'offline',
			scripts: [
				{ id: 's2', src: 'https://b.example/b.js', category: 'measurement' },
			],
		});

		expect(a.consentStore).not.toBe(b.consentStore);
	});
});

describe('v3 gate: pure kernel construction', () => {
	// Gate: constructing a kernel must not write to window. v2 writes
	// `window[namespace]` unconditionally at store/index.ts:632. v3's
	// `createConsentKernel()` is pure; window exposure is an opt-in module
	// the adapter invokes post-mount when it actually wants a dev hook.
	test.fails('createConsentKernel() must not write to window', () => {
		const manager = createMockConsentManager();
		const writes = new Set<string | symbol>();

		const guardedWindow = new Proxy(
			{},
			{
				set(_target, prop) {
					writes.add(prop);
					return true;
				},
				get() {
					return undefined;
				},
			}
		);
		vi.stubGlobal('window', guardedWindow);

		try {
			createConsentManagerStore(manager, {
				initialConsentCategories: ['necessary'],
			});

			// v2: window['c15tStore'] is written at store/index.ts:632
			// v3: zero window writes during kernel construction
			expect(writes.size).toBe(0);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
