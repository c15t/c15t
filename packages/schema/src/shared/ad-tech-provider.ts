/**
 * Google Additional Consent providers.
 *
 * A Google ad tech provider (ATP) from Google's Additional Consent provider
 * list (`additional-consent-providers.csv`): an ad tech company that is not
 * registered on the IAB Global Vendor List. Its ID is Google's, not a GVL
 * vendor ID.
 *
 * The backend, the manifest resolvers and the browser CMP all read the same
 * provider list response, so the request and parsing rules live here.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

/** Schema for one Google ad tech provider. */
export const adTechProviderSchema = v.object({
	/** Google ATP ID. */
	id: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
	/** Provider name as Google lists it. */
	name: v.pipe(v.string(), v.trim(), v.minLength(1)),
	/** Privacy policy URL as Google lists it. */
	policyUrl: v.pipe(v.string(), v.regex(/^https?:\/\//iu)),
});

export type AdTechProvider = v.InferOutput<typeof adTechProviderSchema>;

/**
 * Default provider list endpoint. It serves Google's provider CSV as JSON,
 * filtered by `?providerIds=1,2,3`.
 */
export const AD_TECH_PROVIDERS_URL = 'https://gvl.inth.app/additional-consent';

/**
 * Most provider IDs put in a request URL, the same cap the vendor list uses.
 * Above it the whole list is requested and narrowed after parsing, so a long
 * configuration costs bytes rather than a failed request.
 */
export const MAX_AD_TECH_PROVIDER_QUERY_IDS = 500;

/**
 * How long a provider list request may take before it is aborted. The list
 * only supplements the TC String, so a stalled endpoint must not hold `/init`
 * or a consent save open: an aborted request takes the same path as a failed
 * one.
 */
export const AD_TECH_PROVIDER_FETCH_TIMEOUT_MS = 5000;

/**
 * A signal that aborts a provider list request after
 * {@link AD_TECH_PROVIDER_FETCH_TIMEOUT_MS}.
 *
 * @returns The signal, or `undefined` where the runtime has no
 *   `AbortSignal.timeout`.
 */
export const adTechProviderFetchSignal = function adTechProviderFetchSignal():
	| AbortSignal
	| undefined {
	return typeof AbortSignal !== 'undefined' &&
		typeof AbortSignal.timeout === 'function'
		? AbortSignal.timeout(AD_TECH_PROVIDER_FETCH_TIMEOUT_MS)
		: undefined;
};

/**
 * Distinct positive integer IDs, ascending.
 *
 * @param ids - Configured provider IDs.
 * @returns The usable IDs, deduplicated and sorted.
 */
export const normalizeAdTechProviderIds = function normalizeAdTechProviderIds(
	ids: readonly number[]
): number[] {
	return [...new Set(ids)]
		.filter((id) => Number.isSafeInteger(id) && id > 0)
		.sort((a, b) => a - b);
};

/**
 * The request URL for a set of providers. Joined by hand because an endpoint
 * may be relative, which `URL` rejects without a base.
 *
 * @param url - The provider list endpoint.
 * @param ids - Normalized provider IDs.
 * @returns The endpoint with the `providerIds` filter, when it fits.
 */
export const adTechProviderListUrl = function adTechProviderListUrl(
	url: string,
	ids: readonly number[]
): string {
	if (ids.length === 0 || ids.length > MAX_AD_TECH_PROVIDER_QUERY_IDS) {
		return url;
	}
	const query = new URLSearchParams({ providerIds: ids.join(',') });
	return `${url}${url.includes('?') ? '&' : '?'}${query}`;
};

/**
 * One entry of a provider list, checked by hand rather than through
 * {@link adTechProviderSchema}: browser manifest resolvers parse lists too,
 * and must not pull a validation library into their bundle for it.
 */
const readProvider = function readProvider(
	value: unknown
): AdTechProvider | null {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const { id, name, policyUrl } = value as Record<string, unknown>;
	if (
		typeof id !== 'number' ||
		!Number.isSafeInteger(id) ||
		id < 1 ||
		typeof name !== 'string' ||
		name.trim() === '' ||
		typeof policyUrl !== 'string' ||
		!/^https?:\/\//iu.test(policyUrl)
	) {
		return null;
	}
	return { id, name: name.trim(), policyUrl };
};

/**
 * Reads a provider list response, keeping the requested providers Google
 * still lists, sorted by ID. Each entry is checked on its own, so one
 * malformed row does not drop the rest.
 *
 * @param payload - The parsed JSON response.
 * @param ids - Normalized provider IDs the caller asked for.
 * @returns The listed providers, or null when the response has no provider map.
 */
export const parseAdTechProviderList = function parseAdTechProviderList(
	payload: unknown,
	ids: readonly number[]
): AdTechProvider[] | null {
	const listed =
		payload && typeof payload === 'object' && 'providers' in payload
			? (payload as { providers: unknown }).providers
			: null;
	if (!listed || typeof listed !== 'object') {
		return null;
	}
	const byId = new Map<number, AdTechProvider>();
	for (const entry of Object.values(listed)) {
		const provider = readProvider(entry);
		if (provider) {
			byId.set(provider.id, provider);
		}
	}
	return ids.flatMap((id) => {
		const provider = byId.get(id);
		return provider ? [provider] : [];
	});
};
