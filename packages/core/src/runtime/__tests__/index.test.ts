import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentRuntimeOptions } from '../index';
import { clearConsentRuntimeCache, getOrCreateConsentRuntime } from '../index';

const configureConsentManagerMock = vi.fn();
const createConsentManagerStoreMock = vi.fn();
const getMatchingPrefetchedInitialDataMock = vi.fn();

vi.mock('../../client', () => ({
	configureConsentManager: (options: unknown) =>
		configureConsentManagerMock(options),
	clearClientRegistry: vi.fn(),
}));

vi.mock('../../store', () => ({
	createConsentManagerStore: (manager: unknown, options: unknown) =>
		createConsentManagerStoreMock(manager, options),
}));

vi.mock('../../libs/prefetch/prefetch', () => ({
	getMatchingPrefetchedInitialData: (options: unknown) =>
		getMatchingPrefetchedInitialDataMock(options),
}));

describe('runtime', () => {
	let managerCount = 0;
	let storeCount = 0;

	beforeEach(() => {
		managerCount = 0;
		storeCount = 0;
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		getMatchingPrefetchedInitialDataMock.mockReset();

		configureConsentManagerMock.mockImplementation(() => ({
			id: `manager-${++managerCount}`,
		}));
		createConsentManagerStoreMock.mockImplementation(() => ({
			id: `store-${++storeCount}`,
		}));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reuses runtime instances for the same cache key', () => {
		const options = {
			mode: 'offline',
			translations: { defaultLanguage: 'en' },
		} satisfies ConsentRuntimeOptions;
		const pkgInfo = { pkg: '@c15t/react', version: '2.0.0' };

		const first = getOrCreateConsentRuntime(options, pkgInfo);
		const second = getOrCreateConsentRuntime(options, pkgInfo);

		expect(first.cacheKey).toBe(second.cacheKey);
		expect(first.consentManager).toBe(second.consentManager);
		expect(first.consentStore).toBe(second.consentStore);
		expect(configureConsentManagerMock).toHaveBeenCalledTimes(1);
		expect(createConsentManagerStoreMock).toHaveBeenCalledTimes(1);
	});

	it('clears cache and creates new runtime instances', () => {
		const options = {
			mode: 'offline',
		} satisfies ConsentRuntimeOptions;
		const pkgInfo = { pkg: '@c15t/react', version: '2.0.0' };

		const first = getOrCreateConsentRuntime(options, pkgInfo);
		clearConsentRuntimeCache();
		const second = getOrCreateConsentRuntime(options, pkgInfo);

		expect(first.consentManager).not.toBe(second.consentManager);
		expect(first.consentStore).not.toBe(second.consentStore);
		expect(configureConsentManagerMock).toHaveBeenCalledTimes(2);
		expect(createConsentManagerStoreMock).toHaveBeenCalledTimes(2);
	});

	it('normalizes hosted mode defaults and store config metadata', () => {
		const options = {} as ConsentRuntimeOptions;
		const pkgInfo = { pkg: '@c15t/react', version: '2.0.0' };

		const result = getOrCreateConsentRuntime(options, pkgInfo);

		expect(result.cacheKey).toBe(
			'hosted:default:none:default:default:default:default:enabled'
		);
		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'hosted',
				backendURL: '/api/c15t',
			})
		);
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				config: {
					pkg: '@c15t/react',
					version: '2.0.0',
					mode: 'hosted',
					meta: {
						backendURL: '/api/c15t',
						requestCredentials: 'include',
					},
				},
			})
		);
	});

	it('passes custom mode endpoint handlers and normalized store options', () => {
		const endpointHandlers = { init: vi.fn() };
		const iab = { enabled: true };
		const storageConfig = { storageKey: 'consent' };
		const options = {
			mode: 'custom',
			endpointHandlers,
			enabled: false,
			translations: { defaultLanguage: 'de' },
			iab,
			storageConfig,
		} as unknown as ConsentRuntimeOptions;

		getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version: '2.0.0',
		});

		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'custom',
				endpointHandlers,
				storageConfig,
				store: expect.objectContaining({
					initialTranslationConfig: {
						translations: {},
						defaultLanguage: 'de',
					},
					iab,
				}),
			})
		);
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				iab,
				storageConfig,
				initialTranslationConfig: {
					translations: {},
					defaultLanguage: 'de',
				},
			})
		);
	});

	it('prioritizes i18n over legacy translations config when both are provided', () => {
		const options = {
			mode: 'offline',
			translations: {
				defaultLanguage: 'en',
				translations: {
					en: {},
				},
			},
			i18n: {
				locale: 'fr',
				messages: {
					fr: {},
				},
			},
		} as ConsentRuntimeOptions;

		getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version: '2.0.0',
		});

		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				store: expect.objectContaining({
					initialTranslationConfig: expect.objectContaining({
						defaultLanguage: 'fr',
						translations: expect.objectContaining({
							fr: {},
						}),
					}),
				}),
			})
		);
	});

	it('normalizes store-level initialI18nConfig for client/store initialization', () => {
		const options = {
			mode: 'offline',
			store: {
				initialI18nConfig: {
					locale: 'it',
					messages: {
						it: {},
					},
				},
			},
		} as ConsentRuntimeOptions;

		getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version: '2.0.0',
		});

		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				store: expect.objectContaining({
					initialTranslationConfig: expect.objectContaining({
						defaultLanguage: 'it',
						translations: expect.objectContaining({
							it: {},
						}),
					}),
				}),
			})
		);
	});

	it('prefers store-level initialI18nConfig over top-level legacy translations', () => {
		const options = {
			mode: 'offline',
			store: {
				initialI18nConfig: {
					locale: 'it',
					messages: {
						it: {},
					},
				},
			},
			translations: {
				defaultLanguage: 'de',
				translations: {
					de: {},
				},
			},
		} as ConsentRuntimeOptions;

		getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version: '2.0.0',
		});

		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				store: expect.objectContaining({
					initialTranslationConfig: expect.objectContaining({
						defaultLanguage: 'it',
						translations: expect.objectContaining({
							it: {},
						}),
					}),
				}),
			})
		);
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				initialTranslationConfig: expect.objectContaining({
					defaultLanguage: 'it',
					translations: expect.objectContaining({
						it: {},
					}),
				}),
			})
		);
	});

	it('treats legacy c15t mode as hosted for cache and store metadata', () => {
		const options = {
			mode: 'c15t',
		} as ConsentRuntimeOptions;

		const result = getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version: '2.0.0',
		});

		expect(result.cacheKey).toBe(
			'hosted:default:none:default:default:default:default:enabled'
		);
		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'c15t',
			})
		);
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				config: expect.objectContaining({
					mode: 'hosted',
				}),
			})
		);
	});

	it('uses matching browser-prefetched data on first hosted initialization', () => {
		const prefetchedData = Promise.resolve(undefined);
		getMatchingPrefetchedInitialDataMock.mockReturnValue(prefetchedData);
		vi.stubGlobal('window', {} as Window);

		getOrCreateConsentRuntime(
			{
				mode: 'hosted',
				backendURL: '/api/c15t',
			} as ConsentRuntimeOptions,
			{
				pkg: '@c15t/react',
				version: '2.0.0',
			}
		);

		expect(getMatchingPrefetchedInitialDataMock).toHaveBeenCalledWith({
			backendURL: '/api/c15t',
			overrides: undefined,
			credentials: 'include',
		});
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				ssrData: prefetchedData,
				__internal: {
					backendURL: '/api/c15t',
					requestCredentials: 'include',
				},
			})
		);
	});

	it('prefers explicit ssrData over browser-prefetched data', () => {
		const explicitSSRData = Promise.resolve(undefined);
		getMatchingPrefetchedInitialDataMock.mockReturnValue(
			Promise.resolve(undefined)
		);
		vi.stubGlobal('window', {} as Window);

		getOrCreateConsentRuntime(
			{
				mode: 'hosted',
				backendURL: '/api/c15t',
				ssrData: explicitSSRData,
			} as ConsentRuntimeOptions,
			{
				pkg: '@c15t/react',
				version: '2.0.0',
			}
		);

		expect(getMatchingPrefetchedInitialDataMock).not.toHaveBeenCalled();
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				ssrData: explicitSSRData,
			})
		);
	});

	it('does not adopt newly available prefetched data once a store is cached', () => {
		vi.stubGlobal('window', {} as Window);

		const options = {
			mode: 'hosted',
			backendURL: '/api/c15t',
		} as ConsentRuntimeOptions;
		const pkgInfo = {
			pkg: '@c15t/react',
			version: '2.0.0',
		};

		getMatchingPrefetchedInitialDataMock.mockReturnValueOnce(undefined);
		const first = getOrCreateConsentRuntime(options, pkgInfo);

		const laterPrefetchedData = Promise.resolve(undefined);
		getMatchingPrefetchedInitialDataMock.mockReturnValueOnce(
			laterPrefetchedData
		);
		const second = getOrCreateConsentRuntime(options, pkgInfo);

		expect(first.consentStore).toBe(second.consentStore);
		expect(getMatchingPrefetchedInitialDataMock).toHaveBeenCalledTimes(1);
		expect(createConsentManagerStoreMock).toHaveBeenCalledTimes(1);
	});
});
