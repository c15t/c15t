import type { SSRInitRequestContext } from '../store/type';
import type { Overrides } from '../types';
import { hasGlobalPrivacyControlSignal } from './global-privacy-control';

const ABSOLUTE_URL_REGEX = /^https?:\/\//;

function trimTrailingSlash(value: string): string {
	if (value === '/') {
		return value;
	}

	return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeAbsoluteURL(url: URL): string {
	const normalized = url.toString();
	return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function buildRequestContextHeaders(
	overrides?: Pick<Overrides, 'country' | 'region' | 'language'>
): Record<string, string> {
	const headers: Record<string, string> = {};

	if (overrides?.country) {
		headers['x-c15t-country'] = overrides.country;
	}

	if (overrides?.region) {
		headers['x-c15t-region'] = overrides.region;
	}

	if (overrides?.language) {
		headers['accept-language'] = overrides.language;
	}

	return headers;
}

export function canonicalizeBrowserBackendURL(
	backendURL: string
): string | undefined {
	try {
		const normalizedBackendURL = trimTrailingSlash(backendURL);
		if (ABSOLUTE_URL_REGEX.test(normalizedBackendURL)) {
			return normalizeAbsoluteURL(new URL(normalizedBackendURL));
		}

		if (!normalizedBackendURL.startsWith('/')) {
			return undefined;
		}

		return normalizeAbsoluteURL(
			new URL(normalizedBackendURL, window.location.origin)
		);
	} catch {
		return undefined;
	}
}

export interface RuntimeRequestContextMatcher {
	backendURL: string;
	country?: string;
	region?: string;
	language?: string;
	gpc: boolean;
	credentials: RequestCredentials;
}

export function createBrowserRequestContext(options: {
	backendURL: string;
	overrides?: Pick<Overrides, 'country' | 'region' | 'language'>;
	credentials?: RequestCredentials;
	gpc?: boolean;
}): SSRInitRequestContext | undefined {
	const normalizedBackendURL = canonicalizeBrowserBackendURL(
		options.backendURL
	);
	if (!normalizedBackendURL) {
		return undefined;
	}
	const detectedGpc = hasGlobalPrivacyControlSignal();

	return {
		backendURL: normalizedBackendURL,
		country: options.overrides?.country ?? null,
		region: options.overrides?.region ?? null,
		language: options.overrides?.language ?? null,
		gpc:
			options.gpc ?? (typeof detectedGpc === 'boolean' ? detectedGpc : false),
		credentials: options.credentials ?? 'include',
	};
}

export function createRuntimeRequestContextMatcher(options: {
	backendURL: string;
	overrides?: Overrides;
	credentials?: RequestCredentials;
}): RuntimeRequestContextMatcher | undefined {
	const normalizedBackendURL = canonicalizeBrowserBackendURL(
		options.backendURL
	);
	if (!normalizedBackendURL) {
		return undefined;
	}
	const detectedGpc = hasGlobalPrivacyControlSignal();

	return {
		backendURL: normalizedBackendURL,
		country: options.overrides?.country,
		region: options.overrides?.region,
		language: options.overrides?.language,
		gpc:
			options.overrides?.gpc ??
			(typeof detectedGpc === 'boolean' ? detectedGpc : false),
		credentials: options.credentials ?? 'include',
	};
}

export function matchesStoredRequestContext(
	stored: SSRInitRequestContext,
	matcher: RuntimeRequestContextMatcher
): boolean {
	if (stored.backendURL !== matcher.backendURL) {
		return false;
	}

	if (stored.gpc !== matcher.gpc) {
		return false;
	}

	if (matcher.country !== undefined && stored.country !== matcher.country) {
		return false;
	}

	if (matcher.region !== undefined && stored.region !== matcher.region) {
		return false;
	}

	if (matcher.language !== undefined && stored.language !== matcher.language) {
		return false;
	}

	if (
		stored.credentials !== undefined &&
		stored.credentials !== matcher.credentials
	) {
		return false;
	}

	return true;
}
