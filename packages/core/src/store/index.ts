/**
 * @packageDocumentation
 * Implements the core consent management store using Zustand.
 * This module provides the main store creation and management functionality.
 */

import { isLegalDocumentType } from '@c15t/schema/types';
import type { PostSubjectInput, PostSubjectOutput } from '@c15t/schema/types';
import { resolveTranslationInput } from '@c15t/translations';
import { createStore } from 'zustand/vanilla';

import type { ConsentManagerInterface } from '../client/client-factory';
import type { StorageConfig } from '../libs/cookie';
import {
	deleteConsentFromStorage,
	getConsentFromStorage,
	saveConsentToStorage,
} from '../libs/cookie';
import { setDebugEnabled } from '../libs/debug';
import { generateSubjectId } from '../libs/generate-subject-id';
import { extractConsentNamesFromCondition, has } from '../libs/has';
import type { HasCondition } from '../libs/has';
import type { IABConfig } from '../libs/iab-tcf/types';
import { createIframeManager } from '../libs/iframe-blocker/store';
import { initConsentManager } from '../libs/init-consent-manager';
import { createNetworkBlockerManager } from '../libs/network-blocker/store';
import {
	filterConsentCategoriesByPolicy,
	shouldEnforcePolicyCategoryScope,
} from '../libs/policy';
import { sanitizeSubjectIdentifiers } from '../libs/sanitize-subject-identifiers';
import { saveConsents } from '../libs/save-consents';
import { createScriptManager } from '../libs/script-loader';
import type {
	Callback,
	OnConsentChangedPayload,
	TranslationConfig,
	User,
} from '../types';
import type { Callbacks } from '../types/callbacks';
import type { ConsentBannerResponse, ConsentState } from '../types/compliance';
import { consentTypes } from '../types/consent-types';
import type { AllConsentNames, ConsentInfo } from '../types/consent-types';
import { coalesceInFlight } from './coalesce-in-flight';
import { initialState } from './initial-state';
import type {
	ConsentStoreState,
	StoreOptions,
	UnstableLegalDocumentConsentInput,
	UnstablePolicyConsentInput,
} from './type';

/**
 * Structure of consent data stored in localStorage.
 *
 * @internal
 */
interface StoredConsent {
	/** Current consent states */
	consents: ConsentState;

	/** Metadata about when and how consent was given */
	consentInfo: ConsentInfo | null;

	/** Stored custom vendor consents (IAB mode only) */
	iabCustomVendorConsents?: Record<string, boolean>;

	/** Stored custom vendor LI state (IAB mode only) */
	iabCustomVendorLegitimateInterests?: Record<string, boolean>;
}

const isLegalDocumentConsentInput = function isLegalDocumentConsentInput(
	input: UnstablePolicyConsentInput
): input is UnstableLegalDocumentConsentInput {
	return isLegalDocumentType(input.type);
};

/**
 * Retrieves stored consent data from localStorage or cookie.
 *
 * @remarks
 * This function handles:
 * - Checking for browser environment
 * - Reading from localStorage (primary)
 * - Falling back to cookie if localStorage unavailable
 * - Syncing cookie if localStorage exists but cookie doesn't
 * - Error handling for invalid data
 *
 * @returns The stored consent data or null if not available
 * @internal
 */
const getStoredConsent = (config?: StorageConfig): StoredConsent | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		return getConsentFromStorage(config);
	} catch (e) {
		console.error('Failed to retrieve stored consent:', e);
		return null;
	}
};

/**
 * Creates a new consent manager store instance.
 *
 * @remarks
 * This function initializes a new consent management store with:
 * - Persistence through localStorage and cookies
 * - Initial state handling
 * - Consent management methods
 * - Privacy settings
 * - Compliance configuration
 *
 * The store is typically used through React hooks but can also be
 * accessed directly for non-React applications.
 *
 * @param manager - Consent manager client used for API calls and
 * persistence
 * @param options - Optional configuration for the store instance
 * @returns A Zustand store instance with consent management
 * functionality
 *
 * @example
 * Basic usage:
 * ```typescript
 * const store = createConsentManagerStore(manager);
 *
 * // Subscribe to state changes
 * const unsubscribe = store.subscribe(
 *   (state) => console.log('Consent updated:', state.consents),
 * );
 *
 * // Update consent
 * store.getState().setConsent('analytics', true);
 * ```
 *
 * @example
 * Custom namespace:
 * ```typescript
 * const store = createConsentManagerStore(manager, {
 *   namespace: 'MyAppConsentStore',
 * });
 *
 * // Access from window
 * const state = window.MyAppConsentStore.getState();
 * ```
 *
 * @public
 */
export const createConsentManagerStore = (
	manager: ConsentManagerInterface,
	options: StoreOptions = {}
) => {
	const internalOptions = options as StoreOptions & {
		__internal?: {
			backendURL?: string;
			initConsentManager?: typeof initConsentManager;
			requestCredentials?: RequestCredentials;
		};
	};
	const initializeConsentManager =
		internalOptions.__internal?.initConsentManager ?? initConsentManager;
	const {
		namespace = 'c15tStore',
		// Extract options that shouldn't be spread directly into state
		iab,
		ssrData: _unusedSsrData,
		initialConsentCategories,
		initialTranslationConfig: legacyInitialTranslationConfig,
		initialI18nConfig,
		enabled: _unusedEnabled,
		debug: _unusedDebug,
		// The rest are valid StoreConfig properties
		...storeConfigOptions
	} = options;

	const hasInitialTranslationInput = Boolean(
		legacyInitialTranslationConfig || initialI18nConfig
	);
	const normalizedInitialTranslationConfig = hasInitialTranslationInput
		? resolveTranslationInput(legacyInitialTranslationConfig, initialI18nConfig)
		: undefined;

	// Enable the global debug logger based on the debug option
	setDebugEnabled(options.debug === true);

	// Load initial state from localStorage if available
	const storedConsent = getStoredConsent(options.storageConfig);
	const consentChangeListeners = new Set<Callback<OnConsentChangedPayload>>();
	const inFlightConsentSaves = new Map<string, Promise<void>>();
	const inFlightPolicyConsents = new Map<string, Promise<PostSubjectOutput>>();

	// oxlint-disable-next-line sort-keys -- Store initialization preserves spread and compatibility field order.
	const store = createStore<ConsentStoreState>((set, get) => ({
		...initialState,
		...storeConfigOptions,
		namespace,
		// IAB manager is created lazily during initConsentManager when iab config is provided
		iab: null,
		// Apply initial consent categories if provided
		...(initialConsentCategories && {
			consentCategories: initialConsentCategories,
		}),
		...(storedConsent
			? {
					activeUI: 'none' as const,
					consentInfo: storedConsent.consentInfo,
					consents: storedConsent.consents,
					isLoadingConsentInfo: false,
					selectedConsents: storedConsent.consents,
					user: storedConsent.consentInfo?.externalId
						? {
								id: storedConsent.consentInfo.externalId,
								identityProvider: storedConsent.consentInfo.identityProvider,
							}
						: undefined,
				}
			: {
					activeUI: 'none' as const,
					isLoadingConsentInfo: true,
				}),
		setActiveUI: (ui, optionsLocal = {}) => {
			if (ui === 'none' || ui === 'dialog') {
				set({ activeUI: ui });
				return;
			}
			// ui === 'banner' — validate before showing
			if (optionsLocal.force) {
				set({ activeUI: 'banner' });
				return;
			}
			const state = get();
			const stored = getStoredConsent();
			if (!stored && !state.consentInfo && !state.isLoadingConsentInfo) {
				set({ activeUI: 'banner' });
			}
		},

		setSelectedConsent: (name, value) => {
			set((state) => {
				const consentType = state.consentTypes.find(
					(type) => type.name === name
				);

				if (consentType?.disabled) {
					return state;
				}

				return {
					selectedConsents: { ...state.selectedConsents, [name]: value },
				};
			});
		},

		saveConsents: (type, optionsLocal) => {
			const requestKey = JSON.stringify([
				type,
				optionsLocal?.uiSource ?? null,
				type === 'custom' ? get().selectedConsents : null,
			]);

			return coalesceInFlight(inFlightConsentSaves, requestKey, () =>
				saveConsents({
					emitConsentChanged: (payload) => {
						get().callbacks.onConsentChanged?.(payload);

						for (const listener of consentChangeListeners) {
							listener(payload);
						}
					},
					get,
					manager,
					options: optionsLocal,
					set,
					type,
				})
			);
		},

		setConsent: (name, value) => {
			set((state) => {
				const consentType = state.consentTypes.find(
					(type) => type.name === name
				);

				// Don't allow changes to disabled consent types
				if (consentType?.disabled) {
					return state;
				}

				// Other selected consents have not been saved/agreed to only the current one.
				const newConsents = { ...state.consents, [name]: value };

				return { selectedConsents: newConsents };
			});

			get().saveConsents('custom');
		},
		resetConsents: () => {
			set(() => {
				const consents = consentTypes.reduce((acc, consent) => {
					acc[consent.name] = consent.defaultValue;
					return acc;
				}, {} as ConsentState);

				const resetState = {
					consentInfo: null,
					consents,
					selectedConsents: consents,
				};
				deleteConsentFromStorage(undefined, options.storageConfig);
				return resetState;
			});
		},
		setConsentCategories: (types) =>
			set(() => {
				const { policyCategories, policyScopeMode } = get();
				if (
					shouldEnforcePolicyCategoryScope(policyCategories, policyScopeMode)
				) {
					return {
						consentCategories: filterConsentCategoriesByPolicy(
							types,
							policyCategories
						),
					};
				}

				return {
					consentCategories: Array.from(new Set(types)),
				};
			}),
		setCallback: (name, handler) => {
			const currentState = get();

			// Update the callback in state
			set((state) => ({
				callbacks: { ...state.callbacks, [name]: handler },
			}));

			// Call the onConsentSet callback with the initial consent state
			if (name === 'onConsentSet' && handler && typeof handler === 'function') {
				(handler as Callbacks['onConsentSet'])?.({
					preferences: currentState.consents,
				});
			}

			// Replay missed onBannerFetched callback if banner was already fetched
			if (
				name === 'onBannerFetched' &&
				currentState.hasFetchedBanner &&
				currentState.lastBannerFetchData &&
				handler &&
				typeof handler === 'function'
			) {
				const { lastBannerFetchData } = currentState;

				const jurisdictionCode = lastBannerFetchData.jurisdiction ?? 'NONE';

				// Type assertion to ensure callback is the correct type
				(handler as Callbacks['onBannerFetched'])?.({
					// Derived visibility: show banner when jurisdiction is not NONE
					jurisdiction: {
						code: jurisdictionCode,
						// Message is no longer returned from the backend; leave empty
						message: '',
					},
					location: {
						countryCode: lastBannerFetchData.location.countryCode ?? null,
						regionCode: lastBannerFetchData.location.regionCode ?? null,
					},
					translations: {
						language: lastBannerFetchData.translations.language,
						translations: lastBannerFetchData.translations.translations,
					},
				});
			}
		},
		subscribeToConsentChanges: (listener) => {
			consentChangeListeners.add(listener);

			return () => {
				consentChangeListeners.delete(listener);
			};
		},
		setLocationInfo: (location) => set({ locationInfo: location }),

		initConsentManager: (): Promise<ConsentBannerResponse | undefined> =>
			initializeConsentManager({
				backendURL: internalOptions.__internal?.backendURL,
				get,
				iabConfig: iab as IABConfig | undefined,
				initialTranslationConfig: normalizedInitialTranslationConfig,
				manager,
				requestCredentials: internalOptions.__internal?.requestCredentials,
				set,
				ssrData: options.ssrData,
			}),

		getDisplayedConsents: () => {
			const { consentCategories, consentTypes: storedConsentTypes } = get();
			return storedConsentTypes.filter((consent) =>
				consentCategories.includes(consent.name)
			);
		},

		hasConsented: () => {
			const { consentInfo } = get();
			return consentInfo !== null && consentInfo !== undefined;
		},

		has: <CategoryType extends AllConsentNames>(
			condition: HasCondition<CategoryType>
		) => {
			const { consents, policyCategories, policyScopeMode } = get();
			return has(condition, consents, {
				policyCategories,
				policyScopeMode,
			});
		},

		setTranslationConfig: (config: TranslationConfig) => {
			set({ translationConfig: config });
		},

		updateConsentCategories: (newCategories: AllConsentNames[]) => {
			const {
				consentCategories: currentConsentCategories,
				policyCategories,
				policyScopeMode,
			} = get();
			const allCategoriesSet = new Set<AllConsentNames>([
				...currentConsentCategories,
				...newCategories,
			]);
			let consentCategories: AllConsentNames[];

			if (shouldEnforcePolicyCategoryScope(policyCategories, policyScopeMode)) {
				consentCategories = filterConsentCategoriesByPolicy(
					Array.from(allCategoriesSet),
					policyCategories
				);
			} else {
				consentCategories = Array.from(allCategoriesSet);
			}

			set({ consentCategories });
		},

		identifyUser: async (user: User) => {
			const currentInfo = get().consentInfo;
			const subjectId = currentInfo?.subjectId;

			// Always store the user in state (so it's available when consent is given)
			set({ user });

			// If no consent yet, just store in state and return early
			// The user will be linked when they give consent via saveConsents
			// Don't set consentInfo here - it should only exist after actual consent
			if (!subjectId) {
				return;
			}

			// Skip API call if the user is already linked with the same externalId
			// This prevents unnecessary PATCH calls on page load
			if (
				String(currentInfo?.externalId) === String(user.id) &&
				currentInfo?.identityProvider === user.identityProvider
			) {
				return;
			}

			// Make API call to link the user to the subject
			await manager.identifyUser({
				body: {
					externalId: user.id,
					identityProvider: user.identityProvider,
					subjectId,
				},
			});

			// Sync store state
			set({
				consentInfo: {
					...currentInfo,
					externalId: user.id,
					identityProvider: user.identityProvider,
					subjectId,
					time: currentInfo?.time || Date.now(),
				},
			});
		},
		unstable_acceptPolicyConsent: (input) => {
			const requestKey = JSON.stringify([
				get().consentInfo?.subjectId ?? null,
				input,
			]);

			// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
			return coalesceInFlight(inFlightPolicyConsents, requestKey, async () => {
				const currentState = get();
				const currentInfo = currentState.consentInfo;
				const subjectId = currentInfo?.subjectId ?? generateSubjectId();
				const storedIdentifiers = sanitizeSubjectIdentifiers({
					externalId: currentInfo?.externalId,
					identityProvider: currentInfo?.identityProvider,
				});
				const userIdentifiers = sanitizeSubjectIdentifiers({
					externalId: currentState.user?.id,
					identityProvider: currentState.user?.identityProvider,
				});
				const inputIdentifiers = sanitizeSubjectIdentifiers({
					externalId: input.externalId,
					identityProvider: input.identityProvider,
				});
				const externalId =
					inputIdentifiers.externalId ??
					storedIdentifiers.externalId ??
					userIdentifiers.externalId;
				const identityProvider =
					inputIdentifiers.identityProvider ??
					storedIdentifiers.identityProvider ??
					userIdentifiers.identityProvider;
				const domain =
					input.domain ??
					(typeof window === 'undefined'
						? 'localhost'
						: window.location.hostname);
				const legalDocumentConsent = isLegalDocumentConsentInput(input);
				let legalDocumentFields: Record<string, string> = {};

				if (legalDocumentConsent) {
					if (input.documentSnapshotToken) {
						legalDocumentFields = {
							documentSnapshotToken: input.documentSnapshotToken,
						};
					} else if (input.policyHash) {
						legalDocumentFields = {
							policyHash: input.policyHash,
						};
					} else if (input.policyId) {
						legalDocumentFields = {
							policyId: input.policyId,
						};
					} else {
						throw new Error(
							'Legal document consent requires documentSnapshotToken, policyHash, or policyId.'
						);
					}
				}

				const givenAt = input.givenAt ?? Date.now();

				const consentBody: PostSubjectInput = {
					domain,
					givenAt,
					subjectId,
					type: input.type,
					uiSource: input.uiSource ?? 'api',
					...legalDocumentFields,
				};
				if (input.metadata) {
					consentBody.metadata = input.metadata;
				}
				if (input.preferences) {
					consentBody.preferences = input.preferences;
				}
				if (externalId) {
					consentBody.externalSubjectId = externalId;
				}
				if (identityProvider) {
					consentBody.identityProvider = identityProvider;
				}

				const response = await manager.setConsent({
					body: consentBody,
				});

				if (!response.ok || !response.data) {
					const errorMsg =
						response.error?.message ?? 'Failed to accept policy consent';
					get().callbacks.onError?.({
						error: errorMsg,
					});
					const error = new Error(errorMsg) as Error & {
						code?: string;
						details?: Record<string, unknown> | null;
						status?: number;
					};
					error.code = response.error?.code;
					error.details = response.error?.details ?? null;
					error.status = response.error?.status;
					throw error;
				}

				const consent = {
					...response.data,
					givenAt:
						response.data.givenAt instanceof Date
							? response.data.givenAt
							: new Date(response.data.givenAt),
				};

				const latestState = get();
				const latestInfo = latestState.consentInfo;
				const nextConsentInfo: ConsentInfo = {
					...latestInfo,
					subjectId,
					time: consent.givenAt.getTime(),
				};
				if (externalId) {
					nextConsentInfo.externalId = externalId;
				}
				if (identityProvider) {
					nextConsentInfo.identityProvider = identityProvider;
				}

				const statePatch: Partial<ConsentStoreState> = {
					consentInfo: nextConsentInfo,
				};
				if (externalId) {
					statePatch.user = {
						id: externalId,
						identityProvider,
					};
				}

				set(statePatch);

				saveConsentToStorage(
					{
						consentInfo: nextConsentInfo,
						consents: latestState.consents,
					},
					undefined,
					latestState.storageConfig
				);

				return consent;
			});
		},

		setOverrides: async (
			overrides: ConsentStoreState['overrides']
		): Promise<ConsentBannerResponse | undefined> => {
			set({ overrides: { ...get().overrides, ...overrides } });

			return await initializeConsentManager(
				// oxlint-disable-next-line sort-keys -- Initialization options preserve the compatibility call order.
				{
					manager,
					backendURL: internalOptions.__internal?.backendURL,
					requestCredentials: internalOptions.__internal?.requestCredentials,
					initialTranslationConfig: normalizedInitialTranslationConfig,
					// Without the IAB config, re-initialization skips IAB entirely
					// and the store keeps a stale GVL (e.g. after a language change).
					iabConfig: iab as IABConfig | undefined,
					get,
					set,
				}
			);
		},

		setLanguage: async (
			language: string
		): Promise<ConsentBannerResponse | undefined> =>
			await get().setOverrides({
				...(get().overrides ?? {}),
				language,
			}),

		...createScriptManager(get, set),
		...createIframeManager(get, set),
		...createNetworkBlockerManager(get, set),
	}));

	// Initialize the iframe blocker after the store is created
	store.getState().initializeIframeBlocker();

	// Initialize the network blocker after the store is created
	if (options.networkBlocker) {
		store.setState({
			networkBlocker: options.networkBlocker,
		});
		store.getState().initializeNetworkBlocker();
	}

	// Add script categories to consentCategories
	if (options.scripts && options.scripts.length > 0) {
		store
			.getState()
			.updateConsentCategories(
				options.scripts.flatMap((script) =>
					extractConsentNamesFromCondition(script.category)
				)
			);
	}

	if (typeof window !== 'undefined') {
		// oxlint-disable-next-line typescript/no-explicit-any -- its okay
		(window as any)[namespace] = store;

		// When the store is initialized, call the onConsentSet callback with the initial consent state
		store
			.getState()
			.callbacks.onConsentSet?.({ preferences: store.getState().consents });

		// Identify the user if an external ID is provided
		if (options.user) {
			store.getState().identifyUser(options.user);
		}

		store.getState().initConsentManager();
	}

	return store;
};

export * from './type';
