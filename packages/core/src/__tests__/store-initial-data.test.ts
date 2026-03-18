import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Script } from '../libs/script-loader';
import { createConsentManagerStore } from '../store';
import { defaultTranslationConfig } from '../translations';

describe('Store initial data startup ordering', () => {
	beforeEach(() => {
		Object.defineProperty(document, 'readyState', {
			value: 'complete',
			writable: true,
			configurable: true,
		});

		Object.defineProperty(document, 'querySelectorAll', {
			value: vi.fn().mockReturnValue([]),
			writable: true,
			configurable: true,
		});

		Object.defineProperty(document, 'body', {
			value: {
				appendChild: vi.fn(),
				removeChild: vi.fn(),
			},
			writable: true,
			configurable: true,
		});

		Object.defineProperty(document, 'addEventListener', {
			value: vi.fn(),
			writable: true,
			configurable: true,
		});

		global.MutationObserver = class MutationObserver {
			observe = vi.fn();
			disconnect = vi.fn();
			takeRecords = vi.fn().mockReturnValue([]);
		} as unknown as typeof MutationObserver;

		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads alwaysLoad scripts with auto-granted consent when resolved initial data is available', () => {
		const events: Array<{
			type: 'load' | 'change';
			consents: {
				marketing: boolean;
				measurement: boolean;
			};
		}> = [];

		const script: Script = {
			id: 'proof-always-load',
			category: 'measurement',
			alwaysLoad: true,
			callbackOnly: true,
			onBeforeLoad({ consents }) {
				events.push({
					type: 'load',
					consents: {
						marketing: consents.marketing,
						measurement: consents.measurement,
					},
				});
			},
			onConsentChange({ consents }) {
				events.push({
					type: 'change',
					consents: {
						marketing: consents.marketing,
						measurement: consents.measurement,
					},
				});
			},
		};

		const mockManager = {
			showConsentBanner: vi.fn(),
			setConsent: vi.fn(),
			verifyConsent: vi.fn(),
			identifyUser: vi.fn(),
			$fetch: vi.fn(),
		};

		const store = createConsentManagerStore(mockManager as never, {
			config: {
				pkg: 'test',
				version: '1.0.0',
				mode: 'test',
			},
			_initialData: {
				showConsentBanner: false,
				branding: 'c15t',
				jurisdiction: {
					code: 'NONE',
					message: 'No consent banner required',
				},
				location: {
					countryCode: 'US',
					regionCode: null,
				},
				translations: {
					language: 'en',
					translations: defaultTranslationConfig.translations.en,
				},
			},
			scripts: [script],
		});

		expect(mockManager.showConsentBanner).not.toHaveBeenCalled();
		expect(store.getState().hasFetchedBanner).toBe(true);
		expect(store.getState().consents.measurement).toBe(true);
		expect(store.getState().consents.marketing).toBe(true);
		expect(events).toEqual([
			{
				type: 'load',
				consents: {
					marketing: true,
					measurement: true,
				},
			},
		]);
	});
});
