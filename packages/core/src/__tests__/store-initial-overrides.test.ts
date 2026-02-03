import { describe, expect, it, vi } from 'vitest';
import type { ConsentManagerInterface } from '../client/client-factory';
import { createConsentManagerStore } from '../store';

// Mock DOM APIs needed by the store
vi.stubGlobal('document', {
	querySelectorAll: vi.fn().mockReturnValue([]),
	cookie: '',
	readyState: 'complete',
	body: {
		appendChild: vi.fn(),
		removeChild: vi.fn(),
	},
	addEventListener: vi.fn(),
});

vi.stubGlobal(
	'MutationObserver',
	class {
		constructor() {}
		disconnect() {}
		observe() {}
		takeRecords() {
			return [];
		}
	}
);

const createMockConsentManager = (): ConsentManagerInterface => ({
	showConsentBanner: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
	identifyUser: vi.fn(),
	$fetch: vi.fn(),
});

describe('Store initialization with overrides', () => {
	it('should initialize with overrides passed in options', () => {
		const overrides = {
			country: 'DE',
			region: 'BE',
			language: 'de',
		};

		const mockManager = createMockConsentManager();
		const store = createConsentManagerStore(mockManager, {
			overrides,
		});

		expect(store.getState().overrides).toEqual(overrides);
	});
});
