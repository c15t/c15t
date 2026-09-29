import {
	deferInitGvl,
	createHostedTransport,
	mergeInitResponseIntoKernelConfig,
} from '@c15t/core';
import type { InitContext } from '@c15t/core';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from '@c15t/schema/types';

import { extractRelevantHeaders } from './headers';
import { normalizeBackendURL } from './normalize-url';
import type {
	ConsentRequestOptions,
	ConsentState,
	ResolveConsentOptions,
} from './types';

/**
 * The request-only part of {@link resolveConsent}: the visitor's state from
 * the consent cookie and request headers, before any backend call.
 */
const readConsentRequest = function readConsentRequest(
	options: ResolveConsentOptions
): ConsentState {
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

	const state: ConsentState = {
		initialPrivacySignals: { gpc: options.headers.get('sec-gpc') === '1' },
		initialRecords,
		now,
	};
	if (Object.keys(overrides).length > 0) {
		state.initialOverrides = overrides;
	}
	return state;
};

const createForwardHeaders = (
	options: ResolveConsentOptions,
	overrides: ConsentState['initialOverrides']
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

/**
 * The init context for a server render. The experiment arm goes along only
 * while the visitor has no stored choice: a visitor who already chose is
 * not shown the banner, so is not counted toward the arm.
 */
const initContext = function initContext(
	base: ConsentState,
	options: ResolveConsentOptions
): InitContext {
	const context: InitContext = {
		overrides: base.initialOverrides ?? {},
		user: base.initialUser ?? null,
	};
	if (options.experiment && !base.initialRecords?.choice) {
		context.experiment = options.experiment;
	}
	return context;
};

/**
 * Resolves the visitor's consent state from a SvelteKit request.
 *
 * 1. Reads the consent cookie, the CDN geo headers, `accept-language`, and
 *    `sec-gpc`. Without a `backendURL` this is the whole result, and no
 *    network call is made.
 * 2. With a `backendURL`, calls `${backendURL}/init` with the request
 *    context and folds the response into the state, so first paint is
 *    correct without waiting for a client roundtrip.
 *
 * Never throws: if the backend URL cannot be resolved or the call fails,
 * the request-only state is returned and the client runs init on mount.
 *
 * @param options - Request headers, cookie name, geo/language overrides,
 * and the backend location.
 * @returns A serializable state for the provider's `prefetch` prop.
 * @example
 * ```ts
 * import { resolveConsent } from '@c15t/svelte/server';
 *
 * const state = await resolveConsent({
 *   backendURL: 'https://consent.example.com',
 *   headers: request.headers,
 * });
 * ```
 */
export const resolveConsent = async function resolveConsent(
	options: ResolveConsentOptions
): Promise<ConsentState> {
	const base = readConsentRequest(options);
	if (!options.backendURL) {
		return base;
	}
	const absoluteBackend = normalizeBackendURL(
		options.backendURL,
		options.headers
	);
	if (!absoluteBackend) {
		return base;
	}

	const forward = createForwardHeaders(options, base.initialOverrides);

	try {
		const fetchImpl =
			options.fetch ??
			options.frameworkFetch ??
			globalThis.fetch?.bind(globalThis);
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
				// Keep the caller's full language preference list. The normalized
				// kernel language is for policy resolution, not HTTP forwarding.
				if (forward['accept-language']) {
					headers.set('accept-language', forward['accept-language']);
				}

				return fetchImpl(input, { ...init, headers });
			},
		});
		const response = await transport.init?.(initContext(base, options));
		if (!response) {
			return base;
		}
		const merged = mergeInitResponseIntoKernelConfig(
			base,
			options.fetch ||
				forward.cookie ||
				(options.frameworkFetch && options.headers.has('authorization')) ||
				options.forwardHeaders?.some((name) => options.headers.has(name))
				? response
				: deferInitGvl(response, `${absoluteBackend}/init`, 'init', forward)
		);
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
export type { ConsentRequestOptions, ConsentState, ResolveConsentOptions };
export { custom, hosted } from '@c15t/core';
export { offline } from '../transports/offline';
