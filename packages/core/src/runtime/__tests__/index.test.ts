import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentRuntimeOptions } from '../index';
import { clearConsentRuntimeCache, getOrCreateConsentRuntime } from '../index';

const configureConsentManagerMock = vi.fn();
const createConsentManagerStoreMock = vi.fn();

vi.mock('../../client', () => ({
	configureConsentManager: (options: unknown) =>
		configureConsentManagerMock(options),
}));

vi.mock('../../store', () => ({
	createConsentManagerStore: (manager: unknown, options: unknown) =>
		createConsentManagerStoreMock(manager, options),
}));

describe('runtime', () => {
	let managerCount = 0;
	let storeCount = 0;

	beforeEach(() => {
		managerCount = 0;
		storeCount = 0;
		vi.clearAllMocks();
		clearConsentRuntimeCache();

		configureConsentManagerMock.mockImplementation(() => ({
			id: `manager-${++managerCount}`,
		}));
		createConsentManagerStoreMock.mockImplementation(() => ({
			id: `store-${++storeCount}`,
		}));
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

	it('normalizes c15t mode defaults and store config metadata', () => {
		const options = {} as ConsentRuntimeOptions;
		const pkgInfo = { pkg: '@c15t/react', version: '2.0.0' };

		const result = getOrCreateConsentRuntime(options, pkgInfo);

		expect(result.cacheKey).toBe('c15t:default:none:default:default:enabled');
		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'c15t',
				backendURL: '/api/c15t',
			})
		);
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				config: {
					pkg: '@c15t/react',
					version: '2.0.0',
					mode: 'Unknown',
				},
			})
		);
	});

	it('passes custom mode endpoint handlers and normalized store options', () => {
		const endpointHandlers = { init: vi.fn() };
		const iab = { enabled: true };
		const options = {
			mode: 'custom',
			endpointHandlers,
			enabled: false,
			translations: { defaultLanguage: 'de' },
			iab,
		} as unknown as ConsentRuntimeOptions;

		getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version: '2.0.0',
		});

		expect(configureConsentManagerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'custom',
				endpointHandlers,
				store: expect.objectContaining({
					initialTranslationConfig: { defaultLanguage: 'de' },
					iab,
				}),
			})
		);
		expect(createConsentManagerStoreMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				initialTranslationConfig: { defaultLanguage: 'de' },
			})
		);
	});
});
