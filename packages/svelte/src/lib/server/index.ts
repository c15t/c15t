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
	const overrides = consentInputsToOverrides(inputs);

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

	const forward: Record<string, string> = {};
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
		if (!response) {
			return base;
		}
		return mergeInitResponseIntoKernelConfig(base, response);
	} catch {
		return base;
	}
};

export type { KernelConfig } from '@c15t/core';
export type { PrefetchInitialConsentOptions, ReadInitialConsentConfigOptions };
export { custom, hosted } from '@c15t/core';
export { offline } from '../transports/offline';
