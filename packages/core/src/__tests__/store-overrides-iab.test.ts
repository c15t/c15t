import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsentManagerInterface } from '../client/client-factory';
import type { IABConfig } from '../libs/iab-tcf/types';
import { createConsentManagerStore } from '../store';

// Mock DOM APIs needed by the store
Object.defineProperty(global, 'document', {
	value: {
		addEventListener: vi.fn(),
		body: {
			appendChild: vi.fn(),
			removeChild: vi.fn(),
		},
		cookie: '',
		querySelectorAll: vi.fn().mockReturnValue([]),
		readyState: 'complete',
	},
	writable: true,
});

if (typeof global.MutationObserver === 'undefined') {
	global.MutationObserver = class MutationObserver {
		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		observe(_target: Node, _options?: MutationObserverInit) {}
		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		disconnect() {}
		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		takeRecords(): MutationRecord[] {
			return [];
		}
	} as unknown as typeof MutationObserver;
}

const createMockConsentManager = (): ConsentManagerInterface => ({
	$fetch: vi.fn(),
	identifyUser: vi.fn(),
	init: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
});

describe('Store setOverrides IAB re-initialization', () => {
	const initConsentManager = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		initConsentManager.mockClear();
	});

	it('forwards the IAB config so re-init refreshes the GVL', async () => {
		// Regression: setOverrides used to call initConsentManager without
		// iabConfig, so initializeIABMode was skipped on re-init and the store
		// kept a stale GVL (e.g. English purposes after switching to French).
		const iabConfig = {
			_module: {
				createIABManager: vi.fn(),
				fetchGVL: vi.fn(),
				initializeIABMode: vi.fn(),
			},
			cmpId: 28,
			enabled: true,
		} as unknown as IABConfig;

		const store = createConsentManagerStore(createMockConsentManager(), {
			iab: iabConfig,
			__internal: {
				initConsentManager,
			},
		} as Parameters<typeof createConsentManagerStore>[1]);

		await store.getState().setOverrides({ language: 'fr' });

		expect(initConsentManager).toHaveBeenCalledWith(
			expect.objectContaining({ iabConfig })
		);
	});
});
