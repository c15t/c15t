import {
	createHostedTransport,
	mergeInitResponseIntoKernelConfig,
} from '@c15t/core/v3';
import type { KernelConfig } from '@c15t/core/v3';
import { readStoredConsentFromCookie } from '@c15t/core/v3/modules/persistence';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from '@c15t/schema/types';

import { normalizeBackendURL } from './normalize-url';
import type {
	PrefetchInitialConsentOptions,
	ReadInitialConsentConfigOptions,
} from './types';

export async function readInitialConsentConfig(
	options: ReadInitialConsentConfigOptions
): Promise<KernelConfig> {
	// The persistence module writes the `c15t` cookie in the v2-compatible
	// compact format — read it with the same shared parser the client uses.
	// `cookieName` only matters if the consumer customized
	// `storageConfig.storageKey` client-side.
	const cookieHeader =
		options.cookieHeader ?? options.headers.get('cookie') ?? undefined;
	const persisted = readStoredConsentFromCookie(
		cookieHeader,
		options.cookieName ? { storageKey: options.cookieName } : undefined
	);
	const initialConsents = persisted?.consents;
	const hasConsented = Boolean(persisted?.consents && persisted.consentInfo);
	const subjectId =
		typeof persisted?.consentInfo?.subjectId === 'string'
			? persisted.consentInfo.subjectId
			: undefined;

	const inputs = extractConsentRequestInputs(options.headers, {
		country: options.country,
		region: options.region,
		language: options.language,
	});
	const overrides = consentInputsToOverrides(inputs);

	const config: KernelConfig = {};
	if (initialConsents) config.initialConsents = initialConsents;
	if (hasConsented) {
		// Without this the server still renders the banner for returning
		// visitors (activeUI derives from hasConsented).
		config.initialHasConsented = true;
		if (subjectId) config.initialSubjectId = subjectId;
	}
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
		return mergeInitResponseIntoKernelConfig(base, response);
	} catch {
		return base;
	}
}

export type { KernelConfig } from '@c15t/core/v3';
export type { PrefetchInitialConsentOptions, ReadInitialConsentConfigOptions };
