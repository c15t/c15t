/**
 * Consent Manager Initialization
 *
 * Handles fetching and processing consent banner information,
 * including SSR data hydration and IAB TCF mode initialization.
 *
 * @packageDocumentation
 */

import type { ResponseContext } from '../../client/types';
import type { InitDataSource, SSRInitialData } from '../../store/type';
import {
	PENDING_CONSENT_SYNC_KEY,
	type PendingConsentSync,
} from '../save-consents';
import { updateStore } from './store-updater';
import type { ConsentBannerResponse, InitConsentManagerConfig } from './types';
import { checkLocalStorageAccess } from './utils';

// Re-export types for external use
export type { ConsentBannerResponse, InitConsentManagerConfig } from './types';

interface InitSourceMetadata {
	initDataSource: InitDataSource;
	initDataSourceDetail: string | null;
}

/**
 * Initializes the consent manager by fetching jurisdiction, location,
 * translations, and branding information.
 *
 * This function handles:
 * - SSR data hydration (uses prefetched data if available)
 * - Client-side API fetching (fallback when no SSR data)
 * - Store state updates
 * - Callback triggers
 * - IAB TCF mode initialization (if enabled)
 *
 * @param config - Configuration object containing store and manager instances
 * @returns A promise that resolves with the consent banner response
 *
 * @example
 * ```typescript
 * const response = await initConsentManager({
 *   manager: consentManager,
 *   get: store.getState,
 *   set: store.setState,
 *   ssrData: ssrPrefetchedData,
 * });
 * ```
 */
export async function initConsentManager(
	config: InitConsentManagerConfig
): Promise<ConsentBannerResponse | undefined> {
	const { get, set, manager } = config;
	const { callbacks } = get();

	// Skip on server-side
	if (typeof window === 'undefined') {
		return undefined;
	}

	// Check if localStorage is available
	const hasLocalStorageAccess = checkLocalStorageAccess(set);
	if (!hasLocalStorageAccess) {
		return undefined;
	}

	set({ isLoadingConsentInfo: true });

	// Process any pending consent sync from a previous page reload
	// This fires the API call that was deferred when consent was revoked
	processPendingConsentSync(manager, callbacks);

	// Try to use SSR-prefetched data first
	const ssrResult = await tryUseSSRData(config);

	if (ssrResult) {
		return ssrResult;
	}

	// Fall back to client-side API fetch
	return fetchFromAPI(config, hasLocalStorageAccess, manager, callbacks);
}

/**
 * Attempts to use SSR-prefetched data if available.
 *
 * @param config - Init configuration
 * @returns The init data if SSR data was used, undefined otherwise
 */
async function tryUseSSRData(
	config: InitConsentManagerConfig
): Promise<ConsentBannerResponse | undefined> {
	const { ssrData, get, set } = config;

	// Skip SSR data if overrides are present (need fresh fetch)
	if (!ssrData || get().overrides) {
		set({ ssrDataUsed: false, ssrSkippedReason: 'no_data' });
		return undefined;
	}

	const data = await ssrData;

	if (data?.init) {
		const initSourceMetadata = inferSSRInitSourceMetadata(data);
		await updateStore(data.init, config, true, data.gvl, {
			initDataSource: initSourceMetadata.initDataSource,
			initDataSourceDetail: initSourceMetadata.initDataSourceDetail,
		});
		set({ ssrDataUsed: true, ssrSkippedReason: null });
		return data.init;
	}

	set({ ssrDataUsed: false, ssrSkippedReason: 'fetch_failed' });
	return undefined;
}

/**
 * Fetches consent data from the API.
 *
 * @param config - Init configuration
 * @param hasLocalStorageAccess - Whether localStorage is accessible
 * @param manager - Consent manager client
 * @param callbacks - Store callbacks
 * @returns The consent banner response or undefined on error
 */
async function fetchFromAPI(
	config: InitConsentManagerConfig,
	hasLocalStorageAccess: boolean,
	manager: InitConsentManagerConfig['manager'],
	callbacks: ReturnType<InitConsentManagerConfig['get']>['callbacks']
): Promise<ConsentBannerResponse | undefined> {
	const { set, get } = config;

	try {
		const { language, country, region } = config.get().overrides ?? {};

		// Fetch init data (GVL is included in response when server has it configured)
		const initContext = (await manager.init({
			headers: {
				...(language && { 'accept-language': language }),
				...(country && { 'x-c15t-country': country }),
				...(region && { 'x-c15t-region': region }),
			},
			onError: callbacks.onError
				? (context) => {
						callbacks.onError?.({
							error: context.error?.message || 'Unknown error',
						});
					}
				: undefined,
		})) as ResponseContext<ConsentBannerResponse>;
		const { data, error } = initContext;

		if (error || !data) {
			throw new Error(`Failed to fetch consent banner info: ${error?.message}`);
		}

		const initSourceMetadata = inferInitSourceMetadata(
			initContext,
			get().config.mode
		);

		// Update store with GVL from response (if available)
		// If GVL is missing from 200 response, store-updater will override IAB to disabled
		await updateStore(
			data,
			config,
			hasLocalStorageAccess,
			data.gvl ?? undefined,
			initSourceMetadata
		);

		return data as ConsentBannerResponse;
	} catch (error) {
		console.error('Error fetching consent banner information:', error);

		set({ isLoadingConsentInfo: false, activeUI: 'none' as const });

		const errorMessage =
			error instanceof Error
				? error.message
				: 'Unknown error fetching consent banner information';
		callbacks.onError?.({ error: errorMessage });

		return undefined;
	}
}

function inferInitSourceMetadata(
	initContext: Pick<ResponseContext<ConsentBannerResponse>, 'response'> | null,
	mode: string
): InitSourceMetadata {
	const response = initContext?.response ?? null;
	if (response) {
		const cache = inspectBackendCache(response.headers);
		if (cache.isCacheHit) {
			return {
				initDataSource: 'backend-cache-hit',
				initDataSourceDetail: cache.detail,
			};
		}
		return {
			initDataSource: 'backend',
			initDataSourceDetail: cache.detail,
		};
	}

	if (mode === 'offline') {
		return { initDataSource: 'offline-mode', initDataSourceDetail: null };
	}
	if (mode === 'custom') {
		return { initDataSource: 'custom', initDataSourceDetail: null };
	}
	if (mode === 'hosted' || mode === 'c15t') {
		return { initDataSource: 'offline-fallback', initDataSourceDetail: null };
	}

	return { initDataSource: 'backend', initDataSourceDetail: null };
}

function inferSSRInitSourceMetadata(data: SSRInitialData): InitSourceMetadata {
	const cache = data.metadata?.cache;
	const requestDurationMs = data.metadata?.requestDurationMs;
	const detailParts: string[] = ['via=ssr'];

	if (cache?.detail) {
		detailParts.push(cache.detail);
	}
	if (
		typeof requestDurationMs === 'number' &&
		Number.isFinite(requestDurationMs)
	) {
		detailParts.push(
			`duration=${Math.max(0, Math.round(requestDurationMs))}ms`
		);
	}

	const detail = detailParts.length > 0 ? detailParts.join(', ') : null;

	if (cache?.isHit === true) {
		return {
			initDataSource: 'backend-cache-hit',
			initDataSourceDetail: detail,
		};
	}

	if (cache) {
		return {
			initDataSource: 'backend',
			initDataSourceDetail: detail,
		};
	}

	return {
		initDataSource: 'ssr',
		initDataSourceDetail: detail,
	};
}

function inspectBackendCache(headers: Headers): {
	isCacheHit: boolean;
	detail: string | null;
} {
	const cacheHeaders = [
		'x-vercel-cache',
		'cf-cache-status',
		'x-cache',
		'cache-status',
	] as const;

	let headerDetail: string | null = null;
	let headerIndicatesHit = false;

	for (const headerName of cacheHeaders) {
		const headerValue = headers.get(headerName);
		if (!headerValue) {
			continue;
		}

		headerDetail = `${headerName}=${headerValue}`;
		headerIndicatesHit = /\b(hit|stale|revalidated|updating)\b/i.test(
			headerValue
		);
		break;
	}

	const ageHeader = headers.get('age');
	const ageValue = ageHeader ? Number.parseInt(ageHeader, 10) : Number.NaN;
	const ageIndicatesCache = Number.isFinite(ageValue) && ageValue > 0;
	const ageDetail = ageIndicatesCache ? `age=${ageValue}` : null;

	const detail =
		headerDetail && ageDetail
			? `${headerDetail}, ${ageDetail}`
			: (headerDetail ?? ageDetail);

	return {
		isCacheHit: headerIndicatesHit || ageIndicatesCache,
		detail,
	};
}

/**
 * Processes any pending consent sync from a previous page reload.
 *
 * When consent is revoked with `reloadOnConsentRevoked` enabled, the page
 * reloads before the API call can complete. The consent data is stored in
 * localStorage and synced to the API on the next page load.
 *
 * @param manager - Consent manager client
 * @param callbacks - Store callbacks for error handling
 */
function processPendingConsentSync(
	manager: InitConsentManagerConfig['manager'],
	callbacks: ReturnType<InitConsentManagerConfig['get']>['callbacks']
): void {
	try {
		const pendingSync = localStorage.getItem(PENDING_CONSENT_SYNC_KEY);
		if (!pendingSync) {
			return;
		}

		// Clear immediately to prevent duplicate syncs
		localStorage.removeItem(PENDING_CONSENT_SYNC_KEY);

		const data: PendingConsentSync = JSON.parse(pendingSync);

		// Fire API call (non-blocking)
		manager
			.setConsent({
				body: {
					type: 'cookie_banner',
					domain: data.domain,
					preferences: data.preferences,
					subjectId: data.subjectId,
					externalSubjectId: data.externalId,
					identityProvider: data.identityProvider,
					jurisdiction: data.jurisdiction,
					jurisdictionModel: data.jurisdictionModel ?? undefined,
					givenAt: data.givenAt,
					uiSource: data.uiSource ?? 'api',
				},
			})
			.then((result) => {
				if (!result.ok) {
					const errorMsg =
						result.error?.message ?? 'Failed to sync consent after reload';
					callbacks.onError?.({ error: errorMsg });
					if (!callbacks.onError) {
						console.error('Failed to sync consent after reload:', errorMsg);
					}
				}
			})
			.catch((err) => {
				const errorMsg =
					err instanceof Error
						? err.message
						: 'Failed to sync consent after reload';
				callbacks.onError?.({ error: errorMsg });
				if (!callbacks.onError) {
					console.error('Failed to sync consent after reload:', err);
				}
			});
	} catch {
		// localStorage might be unavailable or data might be corrupted
		// Silently ignore - consent is already persisted locally
	}
}
