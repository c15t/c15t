/**
 * Google Additional Consent (AC) string, version 2.
 *
 * Carries consent and disclosure for Google ad tech providers (ATPs) that
 * are not on the IAB Global Vendor List. Google reads it beside the TC
 * string and discards it when no TC string comes with it.
 *
 * @see https://support.google.com/admanager/answer/9681920
 * @packageDocumentation
 */

import type { AdTechProvider } from '@c15t/core';

/**
 * Default provider list endpoint. It serves Google's
 * `additional-consent-providers.csv` as JSON, filtered by `providerIds`.
 *
 * @internal
 */
export const AD_TECH_PROVIDERS_ENDPOINT =
	'https://gvl.inth.app/additional-consent';

/**
 * TCF purposes a provider needs before the AC string lists it as consented.
 *
 * Google lists a provider as consented only when the visitor consented to
 * storage and access on the device, and to personal data use for
 * personalised ads: TCF purposes 1, 3 and 4.
 *
 * @internal
 */
export const AD_TECH_PROVIDER_PURPOSES = [1, 3, 4] as const;

/** Consented and disclosed provider IDs read from an AC string. */
export interface AdditionalConsentSignal {
	/** Providers the visitor consented to. */
	consented: number[];
	/**
	 * Every provider the visitor was shown, consented ones included. The
	 * string itself lists a consented provider only once.
	 */
	disclosed: number[];
}

const isProviderId = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const sortedIds = (ids: Iterable<number>): number[] =>
	[...new Set(ids)].filter(isProviderId).sort((a, b) => a - b);

/**
 * Builds an ACv2 string: `2~<consented>~dv.<disclosed, not consented>`.
 *
 * A consented provider is disclosed by definition, so it is written in the
 * consented part only.
 *
 * @param signal - Consented and disclosed provider IDs.
 * @returns The AC string, such as `2~1.10~dv.2.3.4`.
 *
 * @example
 * ```ts
 * encodeAdditionalConsent({ consented: [1, 10], disclosed: [1, 2, 3, 4, 10] });
 * // '2~1.10~dv.2.3.4'
 * ```
 */
export const encodeAdditionalConsent = function encodeAdditionalConsent(
	signal: AdditionalConsentSignal
): string {
	const consented = sortedIds(signal.consented);
	const consentedSet = new Set(consented);
	const disclosedOnly = sortedIds(signal.disclosed).filter(
		(id) => !consentedSet.has(id)
	);
	return `2~${consented.join('.')}~dv.${disclosedOnly.join('.')}`;
};

const parseIds = (part: string): number[] | null => {
	if (part === '') {
		return [];
	}
	const ids = part.split('.').map(Number);
	return ids.every(isProviderId) ? ids : null;
};

/**
 * Reads an ACv2 string. Version 1 strings and malformed input return `null`.
 *
 * @param value - An AC string such as `2~1.10~dv.2.3.4`.
 * @returns Consented and disclosed IDs, or `null` when the string is not ACv2.
 */
export const decodeAdditionalConsent = function decodeAdditionalConsent(
	value: string
): AdditionalConsentSignal | null {
	const parts = value.split('~');
	if (parts.length !== 3 || parts[0] !== '2') {
		return null;
	}
	const consented = parseIds(parts[1] ?? '');
	const disclosedPart = parts[2] ?? '';
	// `dv` without the dot is allowed when nothing follows it.
	if (disclosedPart !== 'dv' && !disclosedPart.startsWith('dv.')) {
		return null;
	}
	const disclosedOnly = parseIds(disclosedPart.slice(3));
	if (!consented || !disclosedOnly) {
		return null;
	}
	return {
		consented: sortedIds(consented),
		disclosed: sortedIds([...consented, ...disclosedOnly]),
	};
};

/**
 * Builds the AC string for a confirmed choice.
 *
 * Every provider in `choices` was shown to the visitor, so it is disclosed.
 * It is consented when its switch is on and the TC string consents to every
 * purpose in {@link AD_TECH_PROVIDER_PURPOSES}.
 *
 * @param choices - Provider switches keyed by provider ID, one per shown provider.
 * @param purposeConsents - Purpose consents encoded in the TC string.
 * @returns The AC string, or `undefined` when no provider was shown.
 * @internal
 */
export const additionalConsentFor = function additionalConsentFor(
	choices: Readonly<Record<string, boolean>>,
	purposeConsents: Readonly<Record<number, boolean>>
): string | undefined {
	const disclosed = Object.keys(choices).map(Number).filter(isProviderId);
	if (disclosed.length === 0) {
		return undefined;
	}
	const purposesGranted = AD_TECH_PROVIDER_PURPOSES.every(
		(purpose) => purposeConsents[purpose] === true
	);
	return encodeAdditionalConsent({
		consented: purposesGranted
			? disclosed.filter((id) => choices[String(id)] === true)
			: [],
		disclosed,
	});
};

const readProvider = (value: unknown): AdTechProvider | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const { id, name, policyUrl } = value as Record<string, unknown>;
	if (
		!isProviderId(id) ||
		typeof name !== 'string' ||
		name.trim() === '' ||
		typeof policyUrl !== 'string' ||
		!/^https?:\/\//iu.test(policyUrl)
	) {
		return null;
	}
	return { id, name, policyUrl };
};

/**
 * Reads a provider list response, keeping only the requested providers
 * Google still lists, sorted by ID.
 *
 * @internal
 */
export const readAdTechProviderList = function readAdTechProviderList(
	payload: unknown,
	providerIds: readonly number[]
): AdTechProvider[] {
	const listed =
		payload && typeof payload === 'object' && 'providers' in payload
			? (payload as { providers: unknown }).providers
			: null;
	if (!listed || typeof listed !== 'object') {
		throw new Error('Invalid ad tech provider list: missing providers');
	}
	const entries = Array.isArray(listed) ? listed : Object.values(listed);
	const byId = new Map<number, AdTechProvider>();
	for (const entry of entries) {
		const provider = readProvider(entry);
		if (provider) {
			byId.set(provider.id, provider);
		}
	}
	return sortedIds(providerIds).flatMap((id) => {
		const provider = byId.get(id);
		return provider ? [provider] : [];
	});
};

const inflight = new Map<string, Promise<AdTechProvider[]>>();

/**
 * Fetches names and privacy policy links for Google ad tech providers.
 *
 * Providers Google no longer lists are left out: the AC string may only
 * carry IDs from Google's current file.
 *
 * @param providerIds - Google ATP IDs the publisher works with.
 * @param endpoint - Provider list URL. Defaults to {@link AD_TECH_PROVIDERS_ENDPOINT}.
 * @returns The listed providers, sorted by ID.
 * @throws {Error} When the request fails or the response has no provider map.
 */
export const fetchAdTechProviders = function fetchAdTechProviders(
	providerIds: readonly number[],
	endpoint: string = AD_TECH_PROVIDERS_ENDPOINT
): Promise<AdTechProvider[]> {
	const ids = sortedIds(providerIds);
	if (ids.length === 0) {
		return Promise.resolve([]);
	}
	const url = new URL(
		endpoint,
		typeof window === 'undefined' ? undefined : window.location.href
	);
	url.searchParams.set('providerIds', ids.join(','));
	const key = url.toString();
	const existing = inflight.get(key);
	if (existing) {
		return existing;
	}
	const request = (async () => {
		try {
			const response = await fetch(key);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch ad tech providers: ${response.status} ${response.statusText}`
				);
			}
			return readAdTechProviderList(await response.json(), ids);
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, request);
	return request;
};
