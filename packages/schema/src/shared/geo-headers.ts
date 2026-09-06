/**
 * Canonical consent request-input extraction.
 *
 * THE single source of truth for which HTTP headers carry consent-relevant
 * request context (geo, language, GPC) and in which precedence order.
 * Framework packages must not re-declare these lists or re-implement the
 * extraction — they use their framework-native API to OBTAIN the raw
 * headers, then call into here to INTERPRET them. (The 2026-07-06
 * shared-logic drift audit found four diverged hand-rolled copies of
 * these rules; see `internals/audits/2026-07-06-shared-logic-drift.md`.)
 *
 * Precedence rule: the explicit `x-c15t-*` override headers ALWAYS win
 * over infrastructure-derived headers (Cloudflare, Vercel, CloudFront,
 * generic proxies). Infra order after that: Cloudflare → Vercel →
 * CloudFront → generic.
 */
import { parseAcceptLanguage } from '@c15t/translations';

/** Country headers, highest priority first. `x-c15t-country` always wins. */
export const COUNTRY_HEADERS = [
	'x-c15t-country',
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-amz-cf-ipcountry',
	'x-country-code',
	'x-country',
] as const;

/** Region headers, highest priority first. `x-c15t-region` always wins. */
export const REGION_HEADERS = [
	'x-c15t-region',
	'cf-region-code',
	'x-vercel-ip-country-region',
	'x-region-code',
] as const;

/**
 * Every header name that carries a consent request input. This is the
 * canonical allowlist for forwarding to a c15t backend and for cache-key
 * derivation. Framework adapters may append transport-specific extras
 * (e.g. `user-agent`, prefetch hints) but must include all of these.
 */
/**
 * GPC headers, highest priority first. `x-c15t-gpc` is the application
 * override: browsers refuse to let scripts set `Sec-*` request headers, so a
 * client that needs to assert a GPC value on its own init request sends it
 * here, and the user agent's `Sec-GPC` remains the browser-provided signal.
 */
export const GPC_HEADERS = ['x-c15t-gpc', 'sec-gpc'] as const;

export const CONSENT_REQUEST_HEADER_NAMES = [
	...COUNTRY_HEADERS,
	...REGION_HEADERS,
	'accept-language',
	...GPC_HEADERS,
] as const;

/** Consent-relevant context extracted from request headers. */
export interface ConsentRequestHeaderInputs {
	country?: string;
	region?: string;
	/**
	 * Primary language subtag, lowercase (`de`, not `de-DE`) — the shape
	 * translation selection and the backend resolver operate on. Derived
	 * from the full q-value-aware Accept-Language negotiation in
	 * `@c15t/translations`, not a naive first-token split.
	 */
	language?: string;
	gpc?: boolean;
}

type HeaderSource = Headers | Record<string, string | undefined>;

const getHeader = function getHeader(
	source: HeaderSource,
	name: string
): string | undefined {
	if (typeof (source as Headers).get === 'function') {
		return (source as Headers).get(name) ?? undefined;
	}
	const record = source as Record<string, string | undefined>;
	return record[name] ?? record[name.toLowerCase()];
};

const pickHeader = function pickHeader(
	source: HeaderSource,
	names: readonly string[]
): string | undefined {
	for (const name of names) {
		const value = getHeader(source, name);
		if (value) {
			return value;
		}
	}
	return undefined;
};

/** Parse a `Sec-GPC` header value. Only `'1'`/`'0'` are meaningful. */
export const parseGlobalPrivacyControl = function parseGlobalPrivacyControl(
	value: string | null | undefined
): boolean | undefined {
	if (value === '1') {
		return true;
	}
	if (value === '0') {
		return false;
	}
	return undefined;
};

/**
 * Extract the consent request inputs from request headers.
 *
 * Accepts either a `Headers` instance or a plain lowercase-keyed record so
 * every server runtime (Next.js, SvelteKit, Nitro/H3, edge, Node) can feed
 * whatever its native API returns.
 */
export const extractConsentRequestInputs = function extractConsentRequestInputs(
	headers: HeaderSource,
	overrides: Partial<ConsentRequestHeaderInputs> = {}
): ConsentRequestHeaderInputs {
	const acceptLanguage = getHeader(headers, 'accept-language');
	return {
		country: overrides.country ?? pickHeader(headers, COUNTRY_HEADERS),
		gpc:
			overrides.gpc ??
			parseGlobalPrivacyControl(pickHeader(headers, GPC_HEADERS)),
		language: overrides.language ?? parseAcceptLanguage(acceptLanguage)[0],
		region: overrides.region ?? pickHeader(headers, REGION_HEADERS),
	};
};

/**
 * Inputs → kernel-overrides record, dropping absent fields. Shared by the
 * server helpers that seed `KernelConfig.initialOverrides`.
 */
export const consentInputsToOverrides = function consentInputsToOverrides(
	inputs: ConsentRequestHeaderInputs
): Record<string, string | boolean> {
	const overrides: Record<string, string | boolean> = {};
	if (inputs.country) {
		overrides.country = inputs.country;
	}
	if (inputs.region) {
		overrides.region = inputs.region;
	}
	if (inputs.language) {
		overrides.language = inputs.language;
	}
	if (inputs.gpc !== undefined) {
		overrides.gpc = inputs.gpc;
	}
	return overrides;
};

export const headersToRecord = function headersToRecord(
	headers: Headers
): Record<string, string> {
	const record: Record<string, string> = {};
	headers.forEach((value, key) => {
		record[key.toLowerCase()] = value;
	});
	return record;
};

/**
 * Resolves country and region from common geo IP headers.
 *
 * @deprecated Use {@link extractConsentRequestInputs} — same precedence,
 * plus language and GPC. Kept for the backend's existing call sites.
 */
export const getRegionFromHeaders = function getRegionFromHeaders(
	headers: Record<string, string | undefined>
): {
	region?: string;
	country?: string;
} {
	const country = pickHeader(headers, COUNTRY_HEADERS);
	const region = pickHeader(headers, REGION_HEADERS);

	return {
		...(country && { country }),
		...(region && { region }),
	};
};

// Client IP derivation lives alongside geo: both recover request metadata
// from proxy headers, and both are shared so two backends cannot disagree.
export {
	DEFAULT_IP_HEADERS_LIST,
	getIpAddress,
	type IpAddressConfig,
	maskIpAddress,
} from './client-ip';

// Origin allowlisting: shared for the same reason as the rest of this
// module — a security decision that two live backends must not disagree on.
export {
	isOriginTrusted,
	type LoggerLike,
	matchesWildcard,
} from './trusted-origin';
