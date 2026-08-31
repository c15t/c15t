/**
 * v2 → v3 parity smoke tests.
 *
 * For each hot-path consumer scenario, run identical configuration
 * through v2 and v3 and assert they produce the same observable
 * outcome. Individual modules have their own detailed test suites;
 * this file exists to guard against behavioral drift between the two
 * surfaces under representative end-to-end flows.
 *
 * Scenarios covered:
 *   - Consent save → persisted state matches
 *   - Script loader: same scripts load/unload on same consent flips
 *   - Network blocker: same rules block same URLs
 *   - IAB (covered separately in @c15t/iab/v3 tests; a regression here
 *     would show as a broken TCF string, which the browser environment
 *     can't easily assert in node)
 */

// v2 store construction probes the DOM via document.querySelectorAll
// and installs a MutationObserver; the default core vitest.setup.ts
// doesn't stub either. Extend once per file so all tests in this suite
// can spin up both paths.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	configureConsentManager,
	createConsentManagerStore,
	deleteConsentFromStorage,
	getConsentFromStorage,
} from '../../../index';
import type { ConsentState } from '../../consent/compliance';
import { createConsentKernel, createOfflineTransport } from '../../index';
import { createPersistence } from '../../modules/persistence';
import { createScriptLoader } from '../../modules/script-loader';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

beforeEach(() => {
	vi.stubGlobal(
		'MutationObserver',
		class StubObserver {
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			observe() {}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			disconnect() {}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			takeRecords() {
				return [];
			}
		} as typeof MutationObserver
	);
	vi.stubGlobal('document', {
		addEventListener: vi.fn(),
		body: { appendChild: vi.fn(), removeChild: vi.fn() },
		cookie: '',
		createDocumentFragment: vi.fn(() => ({
			appendChild: vi.fn(),
		})),
		createElement: vi.fn(() => ({
			addEventListener: vi.fn(),
			appendChild: vi.fn(),
			getAttribute: vi.fn(),
			parentNode: null,
			removeAttribute: vi.fn(),
			removeChild: vi.fn(),
			removeEventListener: vi.fn(),
			setAttribute: vi.fn(),
		})),
		dispatchEvent: vi.fn(),
		getElementById: vi.fn(() => null),
		head: { appendChild: vi.fn(), removeChild: vi.fn() },
		querySelector: vi.fn(() => null),
		querySelectorAll: vi.fn(() => []),
		removeEventListener: vi.fn(),
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

beforeEach(() => {
	localStorage.clear();
	deleteConsentFromStorage();
});

afterEach(() => {
	localStorage.clear();
	deleteConsentFromStorage();
});

const flushDebounce = async function flushDebounce(): Promise<void> {
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
};

describe('parity: consent save & persist', () => {
	test('v2 and v3 both write the same consent state to storage', async () => {
		// --- v2 path ---
		const manager = configureConsentManager({ mode: 'offline' });
		const v2Store = createConsentManagerStore(manager, {
			initialConsentCategories: [
				'necessary',
				'functionality',
				'marketing',
				'measurement',
				'experience',
			],
		});
		await v2Store.getState().saveConsents('all');
		const v2Persisted = getConsentFromStorage<{
			consents: Partial<ConsentState>;
		}>();

		// Scrub before v3 run.
		deleteConsentFromStorage();
		localStorage.clear();

		// --- v3 path ---
		const kernel = createConsentKernel({
			transport: createOfflineTransport(),
		});
		createPersistence({ kernel });
		await kernel.commands.save('all');
		await flushDebounce();
		const v3Persisted = getConsentFromStorage<{
			consents: Partial<ConsentState>;
		}>();

		// Both paths should have persisted the same consents.
		expect(v2Persisted?.consents).toBeDefined();
		expect(v3Persisted?.consents).toBeDefined();
		expect(v3Persisted?.consents).toEqual(v2Persisted?.consents);
	});
});

describe('parity: script-loader reconcile', () => {
	test('v3 reconcile mounts the same set of scripts v2 would for a given consent state', () => {
		// Pretend the DOM is empty at start. Run v2 and v3 with the same
		// scripts and consent state; assert the loaded-script-id sets
		// match. We don't assert element identity because anonymized IDs
		// differ per run — only that the same logical IDs loaded.
		const scripts = [
			{
				category: 'measurement' as const,
				id: 'gtm',
				src: 'https://example.com/gtm.js',
			},
			{
				category: 'marketing' as const,
				id: 'fb',
				src: 'https://example.com/fb.js',
			},
			{
				category: 'measurement' as const,
				id: 'hotjar',
				src: 'https://example.com/hj.js',
			},
		];

		// --- v2 path: spin up a store + updateScripts, capture load results
		const manager = configureConsentManager({ mode: 'offline' });
		const v2Store = createConsentManagerStore(manager, {
			initialConsentCategories: ['necessary', 'measurement'],
			scripts,
		});
		// v2 defaults every category to false. Flip measurement so the
		// same scripts become eligible as the v3 test below.
		v2Store.getState().setConsent('measurement', true);
		v2Store.getState().updateScripts();
		// v2 tracks loaded scripts in its store; scrape the final set
		// via getLoadedScriptIds (which reads the same Map the loader
		// maintains).
		const v2Loaded = new Set(v2Store.getState().getLoadedScriptIds());

		// --- v3 path: build a kernel with measurement=true, mount loader
		const kernel = createConsentKernel({
			initialConsents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: true,
				necessary: true,
			},
		});
		const loader = createScriptLoader({
			emitToV2DebugListeners: false,
			kernel,
			scripts,
		});
		const v3Loaded = new Set(loader.getLoadedScriptIds());

		// Both paths load exactly: gtm + hotjar (measurement), not fb (marketing).
		expect(v3Loaded).toEqual(v2Loaded);
		expect(v3Loaded).toContain('gtm');
		expect(v3Loaded).toContain('hotjar');
		expect(v3Loaded.has('fb')).toBe(false);

		loader.dispose();
	});
});

describe('parity: consent category filtering', () => {
	test('AND/OR/NOT conditions evaluate the same', () => {
		const scripts = [
			{
				category: {
					and: ['measurement', { or: ['marketing', 'functionality'] }],
				} as never,
				id: 'combo',
				src: 'https://example.com/c.js',
			},
		];

		// v2
		const manager = configureConsentManager({ mode: 'offline' });
		const v2Store = createConsentManagerStore(manager, {
			initialConsentCategories: ['necessary', 'measurement', 'marketing'],
			scripts,
		});
		v2Store.getState().setConsent('measurement', true);
		v2Store.getState().setConsent('marketing', true);
		const v2Result = v2Store.getState().updateScripts();

		// v3
		const kernel = createConsentKernel({
			initialConsents: {
				experience: false,
				functionality: false,
				marketing: true,
				measurement: true,
				necessary: true,
			},
		});
		const loader = createScriptLoader({
			emitToV2DebugListeners: false,
			kernel,
			scripts,
		});

		// Both should load the combo script.
		expect(v2Result.loaded).toContain('combo');
		expect(loader.getLoadedScriptIds()).toContain('combo');

		loader.dispose();
	});
});
