import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupGTM } from '../libs/gtm';
import type { Script } from '../libs/script-loader';
import { createConsentManagerStore } from '../store';
import { defaultTranslationConfig } from '../translations';

vi.mock('../libs/gtm', async () => {
	const actual =
		await vi.importActual<typeof import('../libs/gtm')>('../libs/gtm');

	return {
		...actual,
		setupGTM: vi.fn(),
	};
});

const restoreDocumentProperty = (
	property: keyof Document,
	descriptor: PropertyDescriptor | undefined
) => {
	if (descriptor) {
		Object.defineProperty(document, property, descriptor);
		return;
	}

	delete (document as Document & Record<string, unknown>)[property];
};

describe('Store initial data startup ordering', () => {
	let originalReadyState: PropertyDescriptor | undefined;
	let originalQuerySelectorAll: PropertyDescriptor | undefined;
	let originalBody: PropertyDescriptor | undefined;
	let originalAddEventListener: PropertyDescriptor | undefined;
	let originalMutationObserver: typeof MutationObserver | undefined;

	beforeEach(() => {
		originalReadyState = Object.getOwnPropertyDescriptor(
			document,
			'readyState'
		);
		originalQuerySelectorAll = Object.getOwnPropertyDescriptor(
			document,
			'querySelectorAll'
		);
		originalBody = Object.getOwnPropertyDescriptor(document, 'body');
		originalAddEventListener = Object.getOwnPropertyDescriptor(
			document,
			'addEventListener'
		);
		originalMutationObserver = global.MutationObserver;

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
		delete (window as typeof window & { c15tStore?: unknown }).c15tStore;
		restoreDocumentProperty('readyState', originalReadyState);
		restoreDocumentProperty('querySelectorAll', originalQuerySelectorAll);
		restoreDocumentProperty('body', originalBody);
		restoreDocumentProperty('addEventListener', originalAddEventListener);

		if (originalMutationObserver) {
			global.MutationObserver = originalMutationObserver;
		} else {
			delete global.MutationObserver;
		}
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

	it('initializes GTM and initial consent callbacks with hydrated consent state', () => {
		const onConsentSet = vi.fn();

		const store = createConsentManagerStore(
			{
				showConsentBanner: vi.fn(),
				setConsent: vi.fn(),
				verifyConsent: vi.fn(),
				identifyUser: vi.fn(),
				$fetch: vi.fn(),
			} as never,
			{
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
				callbacks: {
					onConsentSet,
				},
				scripts: [
					{
						id: 'disable-tracking-blocker',
						category: 'necessary',
						callbackOnly: true,
					},
				],
				unstable_googleTagManager: {
					id: 'GTM-TEST',
				},
			}
		);

		expect(store.getState().consents).toMatchObject({
			necessary: true,
			functionality: true,
			experience: true,
			marketing: true,
			measurement: true,
		});
		expect(vi.mocked(setupGTM)).toHaveBeenCalledWith({
			id: 'GTM-TEST',
			consentState: expect.objectContaining({
				necessary: true,
				functionality: true,
				experience: true,
				marketing: true,
				measurement: true,
			}),
		});
		expect(onConsentSet).toHaveBeenCalledTimes(1);
		expect(onConsentSet).toHaveBeenCalledWith({
			preferences: expect.objectContaining({
				necessary: true,
				functionality: true,
				experience: true,
				marketing: true,
				measurement: true,
			}),
		});
	});
});
