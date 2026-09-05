import {
	createHostedTransport,
	mergeInitResponseIntoKernelConfig,
} from '@c15t/core';
import type { KernelConfig } from '@c15t/core';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from '@c15t/schema/types';

import { extractRelevantHeaders } from './headers';
import { normalizeBackendURL } from './normalize-url';
import type {
	PrefetchInitialConsentOptions,
	ReadInitialConsentConfigOptions,
} from './types';

export const readInitialConsentConfig = function readInitialConsentConfig(
	options: ReadInitialConsentConfigOptions
): Promise<KernelConfig> {
	const now = options.now ?? Date.now();
	const cookieHeader =
		options.cookieHeader ?? options.headers.get('cookie') ?? undefined;
	const initialRecords = readStoredRecordsFromCookieHeader(
		cookieHeader,
		options.cookieName ? { storageKey: options.cookieName } : undefined,
		now
	);
	const inputs = extractConsentRequestInputs(options.headers, {
		country: options.country,
		language: options.language,
		region: options.region,
	});
	const overrides = consentInputsToOverrides({
		country: inputs.country,
		language: inputs.language,
		region: inputs.region,
	});

	const config: KernelConfig = {
		initialPrivacySignals: { gpc: options.headers.get('sec-gpc') === '1' },
		initialRecords,
		now,
	};
	if (Object.keys(overrides).length > 0) {
		config.initialOverrides = overrides;
	}
	return Promise.resolve(config);
};

const createForwardHeaders = (
	options: PrefetchInitialConsentOptions,
	overrides: KernelConfig['initialOverrides']
): Record<string, string> => {
	const forward: Record<string, string> = {
		...extractRelevantHeaders(options.headers),
	};
	const cookieHeader = options.cookieHeader ?? options.headers.get('cookie');
	if (cookieHeader) {
		forward.cookie = cookieHeader;
	}
	for (const key of options.forwardHeaders ?? []) {
		const value = options.headers.get(key);
		if (value) {
			forward[key.toLowerCase()] = value;
		}
	}

	if (overrides?.country) {
		forward['x-c15t-country'] = overrides.country;
	}
	if (overrides?.region) {
		forward['x-c15t-region'] = overrides.region;
	}
	if (options.language) {
		forward['accept-language'] = options.language;
	}

	return forward;
};

export const prefetchInitialConsent = async function prefetchInitialConsent(
	options: PrefetchInitialConsentOptions
): Promise<KernelConfig> {
	const base = await readInitialConsentConfig(options);
	const absoluteBackend = normalizeBackendURL(
		options.backendURL,
		options.headers
	);
	if (!absoluteBackend) {
		return base;
	}

	const forward = createForwardHeaders(options, base.initialOverrides);

	try {
		const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
		if (!fetchImpl) {
			return base;
		}
		const transport = createHostedTransport({
			backendURL: absoluteBackend,
			// Server-request forwarding is broader than the hosted client's
			// header allowlist. Keep the transport's protocol headers authoritative.
			fetch: (input, init) => {
				const headers = new Headers(forward);
				new Headers(init?.headers).forEach((value, key) => {
					headers.set(key, value);
				});
				return fetchImpl(input, { ...init, headers });
			},
		});
		const response = await transport.init?.({
			overrides: base.initialOverrides ?? {},
			user: base.initialUser ?? null,
		});
		if (!response) {
			return base;
		}
		const merged = mergeInitResponseIntoKernelConfig(base, response);
		if (response.subjectId) {
			merged.initialRecords = {
				...merged.initialRecords,
				subject: {
					...merged.initialRecords?.subject,
					subjectId: response.subjectId,
				},
			};
		}
		delete merged.initialDraft;
		return merged;
	} catch {
		return base;
	}
};

export type { KernelConfig } from '@c15t/core';
export type { PrefetchInitialConsentOptions, ReadInitialConsentConfigOptions };
export { custom, hosted } from '@c15t/core';
export { offline } from '../transports/offline';
