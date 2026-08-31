import { describe, expect, it, vi } from 'vitest';

import type { ConsentManagerInterface } from '../client/client-factory';
import { createConsentManagerStore } from '../store';

// Mock DOM APIs needed by the store
vi.stubGlobal('document', {
	addEventListener: vi.fn(),
	body: {
		appendChild: vi.fn(),
		removeChild: vi.fn(),
	},
	cookie: '',
	querySelectorAll: vi.fn().mockReturnValue([]),
	readyState: 'complete',
});

vi.stubGlobal(
	'MutationObserver',
	class {
		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		disconnect() {}
		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		observe() {}
		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		takeRecords() {
			return [];
		}
	}
);

const createMockConsentManager = (): ConsentManagerInterface => ({
	$fetch: vi.fn(),
	identifyUser: vi.fn(),
	setConsent: vi.fn(),
	showConsentBanner: vi.fn(),
	verifyConsent: vi.fn(),
});

describe('Store initialization with overrides', () => {
	it('should initialize with overrides passed in options', () => {
		const overrides = {
			country: 'DE',
			language: 'de',
			region: 'BE',
		};

		const mockManager = createMockConsentManager();
		const store = createConsentManagerStore(mockManager, {
			overrides,
		});

		expect(store.getState().overrides).toEqual(overrides);
	});
});
