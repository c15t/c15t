import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentManagerInterface } from '../client/client-factory';
import type { IABConfig } from '../libs/iab-tcf/types';
import { initConsentManager } from '../libs/init-consent-manager';
import { createConsentManagerStore } from '../store';

vi.mock('../libs/init-consent-manager', () => ({
	initConsentManager: vi.fn().mockResolvedValue(undefined),
}));

// Mock DOM APIs needed by the store
Object.defineProperty(global, 'document', {
	value: {
		querySelectorAll: vi.fn().mockReturnValue([]),
		cookie: '',
		readyState: 'complete',
		body: {
			appendChild: vi.fn(),
			removeChild: vi.fn(),
		},
		addEventListener: vi.fn(),
	},
	writable: true,
});

if (typeof global.MutationObserver === 'undefined') {
	global.MutationObserver = class MutationObserver {
		observe(_target: Node, _options?: MutationObserverInit) {}
		disconnect() {}
		takeRecords(): MutationRecord[] {
			return [];
		}
	} as unknown as typeof MutationObserver;
}

const createMockConsentManager = (): ConsentManagerInterface => ({
	init: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
	identifyUser: vi.fn(),
	$fetch: vi.fn(),
});

describe('Store setOverrides IAB re-initialization', () => {
	beforeEach(() => {
		vi.mocked(initConsentManager).mockClear();
	});

	it('forwards the IAB config so re-init refreshes the GVL', async () => {
		// Regression: setOverrides used to call initConsentManager without
		// iabConfig, so initializeIABMode was skipped on re-init and the store
		// kept a stale GVL (e.g. English purposes after switching to French).
		const iabConfig = {
			enabled: true,
			cmpId: 28,
			_module: {
				createIABManager: vi.fn(),
				initializeIABMode: vi.fn(),
				fetchGVL: vi.fn(),
			},
		} as unknown as IABConfig;

		const store = createConsentManagerStore(createMockConsentManager(), {
			iab: iabConfig,
		});

		await store.getState().setOverrides({ language: 'fr' });

		expect(initConsentManager).toHaveBeenCalledWith(
			expect.objectContaining({ iabConfig })
		);
	});
});
