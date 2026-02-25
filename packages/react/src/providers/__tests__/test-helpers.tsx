// test-helpers.ts - Common mock setup
import type {
	InitOutput,
	PostConsentInput,
	PostConsentOutput,
	VerifyConsentInput,
	VerifyConsentOutput,
} from 'c15t';

import { beforeEach, type Mock, vi } from 'vitest';
import { type ConsentManagerOptions, useConsentManager } from '~/index';

export type SetConsentRequestBody = PostConsentInput;
export type SetConsentResponse = PostConsentOutput;
export type ShowConsentBannerResponse = InitOutput;
export type VerifyConsentRequestBody = VerifyConsentInput;
export type VerifyConsentResponse = VerifyConsentOutput;

export function setupMocks(): {
	mockFetch: Mock;
	mockConfigureConsentManager: Mock;
} {
	// Mock fetch globally
	const mockFetch = vi.fn();
	window.fetch = mockFetch;

	// Create a mocked version of the consent manager
	const mockConfigureConsentManager = vi.fn();

	// Create a map to track fetch calls per backend URL
	const fetchCallMap = new Map<string, boolean>();
	const runtimeCache = new Map<
		string,
		{ consentManager: unknown; consentStore: unknown }
	>();

	// Reset tracking between tests
	beforeEach(() => {
		fetchCallMap.clear();
		runtimeCache.clear();
	});

	// Mock c15t module
	vi.mock('c15t', async () => {
		const originalModule = await vi.importActual('c15t');
		const { createConsentManagerStore } =
			originalModule as typeof import('c15t');

		const createMockConsentManager = (options: ConsentManagerOptions) => {
			// Call the mock for tracking
			mockConfigureConsentManager(options);

			const backendURL = options.backendURL || '';

			// Only register fetch calls for hosted backend mode
			if (options.mode === 'hosted' || options.mode === 'c15t') {
				// Create a client that will track fetch calls
				return {
					getCallbacks: () => options.callbacks,
					showConsentBanner: async () => {
						// Each unique URL should trigger a fetch call once
						if (!fetchCallMap.has(backendURL)) {
							// Make the mock fetch call that the test expects
							mockFetch(`${backendURL}/init`, {
								headers: { 'Content-Type': 'application/json' },
							});
							// Mark this URL as called
							fetchCallMap.set(backendURL, true);
						}
						return {
							ok: true,
							data: { showConsentBanner: true },
							error: null,
							response: null,
						};
					},
					setConsent: async () => ({
						ok: true,
						data: { success: true },
						error: null,
						response: null,
					}),
					verifyConsent: async () => ({
						ok: true,
						data: { valid: true },
						error: null,
						response: null,
					}),
				};
			}

			// For offline mode
			if (options.mode === 'offline') {
				return {
					getCallbacks: () => options.callbacks,
					showConsentBanner: async () => ({
						ok: true,
						data: { showConsentBanner: true },
						error: null,
						response: null,
					}),
					setConsent: async () => ({
						ok: true,
						data: { success: true },
						error: null,
						response: null,
					}),
					verifyConsent: async () => ({
						ok: true,
						data: { valid: true },
						error: null,
						response: null,
					}),
				};
			}

			// For custom mode
			if (options.mode === 'custom' && 'endpointHandlers' in options) {
				const handlers = options.endpointHandlers;
				return {
					getCallbacks: () => options.callbacks,
					init: async () => handlers?.init?.({}),
					setConsent: async (data: SetConsentRequestBody) =>
						handlers.setConsent({ body: data }),
					verifyConsent: async (data: VerifyConsentRequestBody) =>
						handlers.verifyConsent({ body: data }),
				};
			}

			// Fallback
			return {
				getCallbacks: () => options.callbacks,
				init: async () => ({
					ok: true,
					data: {
						jurisdiction: 'GDPR',
						location: { countryCode: 'GB', regionCode: null },
						translations: { language: 'en', translations: {} },
						branding: 'c15t',
					},
					error: null,
					response: null,
				}),
				setConsent: async () => ({
					ok: true,
					data: { success: true },
					error: null,
					response: null,
				}),
				verifyConsent: async () => ({
					ok: true,
					data: { valid: true },
					error: null,
					response: null,
				}),
			};
		};

		return {
			...(originalModule as object),
			configureConsentManager: createMockConsentManager,
			getOrCreateConsentRuntime: (
				options: ConsentManagerOptions & {
					translations?: unknown;
					store?: Record<string, unknown>;
				},
				pkgInfo: { pkg: string; version: string }
			) => {
				let mode = options.mode ?? 'hosted';
				if (options.mode === 'c15t') {
					mode = 'hosted';
				}
				const backendURL =
					'backendURL' in options ? options.backendURL : undefined;
				const cacheKey = `${mode}:${backendURL ?? 'default'}`;

				const cached = runtimeCache.get(cacheKey);
				if (cached) {
					return { ...cached, cacheKey };
				}

				let hostedBackendConfig: { backendURL?: string } = {};
				if (mode === 'hosted') {
					hostedBackendConfig = {
						backendURL: backendURL || '/api/c15t',
					};
				}

				const consentManager = createMockConsentManager({
					...(options as ConsentManagerOptions),
					mode,
					...hostedBackendConfig,
				});

				const consentStore = createConsentManagerStore(consentManager, {
					config: {
						pkg: pkgInfo.pkg,
						version: pkgInfo.version,
						mode: options.mode || 'Unknown',
					},
					...options,
					...options.store,
					initialTranslationConfig: options.translations,
				});

				runtimeCache.set(cacheKey, { consentManager, consentStore });
				return { consentManager, consentStore, cacheKey };
			},
		};
	});

	return { mockFetch, mockConfigureConsentManager };
}

// Define a TestConsumer component for reuse in tests
export const TestConsumer = () => {
	const consentManager = useConsentManager();
	return (
		<div data-testid="consumer">
			{consentManager.activeUI === 'banner' ? 'Show' : 'Hide'}
		</div>
	);
};
