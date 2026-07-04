import {
	type ConsentState,
	createHostedTransport,
	type KernelConfig,
	type KernelOverrides,
} from 'c15t/v3';
import { normalizeBackendURL } from './normalize-url';
import type {
	PrefetchInitialConsentOptions,
	ReadInitialConsentConfigOptions,
} from './types';

const CONSENT_COOKIE_DEFAULT = 'c15t-consent';

function parseAcceptLanguage(header: string | null): string | undefined {
	if (!header) return undefined;
	const first = header.split(',')[0]?.trim();
	if (!first) return undefined;
	const code = first.split(';')[0]?.trim();
	return code && code.length <= 10 ? code : undefined;
}

function parseCookieValue(
	cookieHeader: string | null | undefined,
	name: string
): string | undefined {
	if (!cookieHeader) return undefined;
	for (const part of cookieHeader.split(';')) {
		const [rawKey, ...valueParts] = part.trim().split('=');
		if (rawKey === name) return valueParts.join('=');
	}
	return undefined;
}

function parseConsentCookie(
	value: string | undefined
): Partial<ConsentState> | undefined {
	if (!value) return undefined;
	try {
		const decoded = decodeURIComponent(value);
		const parsed = JSON.parse(decoded) as
			| Partial<ConsentState>
			| { consents?: Partial<ConsentState> };
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return undefined;
		}
		if ('consents' in parsed && parsed.consents) return parsed.consents;
		return parsed as Partial<ConsentState>;
	} catch {
		return undefined;
	}
}

export async function readInitialConsentConfig(
	options: ReadInitialConsentConfigOptions
): Promise<KernelConfig> {
	const cookieName = options.cookieName ?? CONSENT_COOKIE_DEFAULT;
	const consentCookie = parseCookieValue(
		options.cookieHeader ?? options.headers.get('cookie'),
		cookieName
	);
	const initialConsents = parseConsentCookie(consentCookie);

	const country =
		options.country ??
		options.headers.get('x-vercel-ip-country') ??
		options.headers.get('cf-ipcountry') ??
		options.headers.get('x-country') ??
		undefined;

	const region =
		options.region ??
		options.headers.get('x-vercel-ip-country-region') ??
		options.headers.get('cf-region-code') ??
		undefined;

	const language =
		options.language ??
		parseAcceptLanguage(options.headers.get('accept-language'));

	const overrides: KernelOverrides = {};
	if (country) overrides.country = country;
	if (region) overrides.region = region;
	if (language) overrides.language = language;

	const config: KernelConfig = {};
	if (initialConsents) config.initialConsents = initialConsents;
	if (Object.keys(overrides).length > 0) {
		config.initialOverrides = overrides;
	}
	return config;
}

export async function prefetchInitialConsent(
	options: PrefetchInitialConsentOptions
): Promise<KernelConfig> {
	const base = await readInitialConsentConfig(options);
	const absoluteBackend = normalizeBackendURL(
		options.backendURL,
		options.headers
	);
	if (!absoluteBackend) return base;

	const forward: Record<string, string> = {};
	const cookieHeader = options.cookieHeader ?? options.headers.get('cookie');
	if (cookieHeader) forward.cookie = cookieHeader;
	for (const key of options.forwardHeaders ?? []) {
		const value = options.headers.get(key);
		if (value) forward[key.toLowerCase()] = value;
	}

	const transport = createHostedTransport({
		backendURL: absoluteBackend,
		fetch: options.fetch,
		headers: forward,
	});

	try {
		const response = await transport.init?.({
			overrides: base.initialOverrides ?? {},
			user: base.initialUser ?? null,
		});
		if (!response) return base;

		const merged: KernelConfig = { ...base };
		if (response.resolvedOverrides) {
			merged.initialOverrides = {
				...(base.initialOverrides ?? {}),
				...response.resolvedOverrides,
			};
		}
		if (response.consents) {
			merged.initialConsents = {
				...(base.initialConsents ?? {}),
				...response.consents,
			};
		}
		if (response.location !== undefined) {
			merged.initialLocation = response.location;
		}
		if (response.translations !== undefined) {
			merged.initialTranslations = response.translations;
		}
		if (response.branding !== undefined)
			merged.initialBranding = response.branding;
		if (response.policy !== undefined) merged.initialPolicy = response.policy;
		if (response.policyDecision !== undefined) {
			merged.initialPolicyDecision = response.policyDecision;
		}
		if (response.policySnapshotToken !== undefined) {
			merged.initialPolicySnapshotToken = response.policySnapshotToken;
		}
		if (
			response.gvl !== undefined ||
			response.customVendors !== undefined ||
			response.cmpId !== undefined
		) {
			merged.initialIab = {
				...(merged.initialIab ?? {}),
				...(response.gvl !== undefined
					? { gvl: response.gvl, enabled: response.gvl !== null }
					: {}),
				...(response.customVendors !== undefined
					? { customVendors: response.customVendors }
					: {}),
				...(response.cmpId !== undefined ? { cmpId: response.cmpId } : {}),
			};
		}
		return merged;
	} catch {
		return base;
	}
}

export type { KernelConfig } from 'c15t/v3';
export type { PrefetchInitialConsentOptions, ReadInitialConsentConfigOptions };
