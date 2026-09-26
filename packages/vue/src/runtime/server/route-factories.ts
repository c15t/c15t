import {
	deferInitGvlToRoute,
	serveGvlReference,
	c15tProtocolHeaders,
	mapInitOutputToInitResponse,
} from '@c15t/core';
import {
	fetchCachedGvl,
	getManifestAge,
	getResolverInputsFromHeaders,
	MANIFEST_PASSTHROUGH_HEADERS,
	reportConsentSession,
	resolveSessionReportBackendURL,
} from '@c15t/core/transports/manifest-cache';
import {
	parsePolicyContractHeader,
	readPolicyResolutionWire,
	writePolicyResolutionWire,
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import {
	defineEventHandler,
	getRequestHeader,
	getRequestHeaders,
	getRequestURL,
	sendNoContent,
	setResponseHeader,
	setResponseStatus,
	sendWebResponse,
} from 'h3';
import type { EventHandlerRequest, H3Event } from 'h3';
import { joinURL } from 'ufo';

import type { ConsentConfig } from '../config';
import {
	C15T_TIMEOUT_HEADER,
	fetchCachedManifest,
	ManifestUnavailableError,
	resolveManifestInit,
} from './manifest-mode';
import type { ManifestFetch } from './manifest-mode';

interface C15TNitroRuntimeConfig {
	c15t?: Record<string, unknown>;
	public?: {
		c15t?: Record<string, unknown>;
	};
}

type RuntimeConfigReader = (event?: H3Event<EventHandlerRequest>) => unknown;

interface RouteDependencies {
	fetch: ManifestFetch;
	useRuntimeConfig: RuntimeConfigReader;
	/**
	 * Receives the promise of a background manifest revalidation started by
	 * a request, with that request's event. Defaults to
	 * {@link waitUntilFromEvent}: Nitro attaches the platform's `waitUntil`
	 * to the event on request-scoped presets (Vercel, Cloudflare, Netlify),
	 * and nothing is registered where there is none. The promise never
	 * rejects.
	 */
	onBackgroundRevalidate?: (
		revalidation: Promise<void>,
		event: H3Event<EventHandlerRequest>
	) => void;
}

/**
 * Hands a promise to the `waitUntil` Nitro places on the event when the
 * deployment preset provides one, so a background refresh outlives the
 * response on runtimes that would otherwise cancel it.
 */
export const waitUntilFromEvent = function waitUntilFromEvent(
	revalidation: Promise<void>,
	event: H3Event<EventHandlerRequest>
): void {
	const { waitUntil } = event as { waitUntil?: unknown };
	if (typeof waitUntil === 'function') {
		(waitUntil as (promise: Promise<unknown>) => void).call(
			event,
			revalidation
		);
	}
};

const bindBackgroundRevalidate = function bindBackgroundRevalidate(
	dependencies: RouteDependencies,
	event: H3Event<EventHandlerRequest>
): (revalidation: Promise<void>) => void {
	const onBackgroundRevalidate =
		dependencies.onBackgroundRevalidate ?? waitUntilFromEvent;
	return (revalidation) => onBackgroundRevalidate(revalidation, event);
};

const readConsentConfig = function readConsentConfig(
	runtimeConfig: unknown
): ConsentConfig {
	const config =
		typeof runtimeConfig === 'object' && runtimeConfig !== null
			? (runtimeConfig as C15TNitroRuntimeConfig)
			: {};
	return {
		...(config.public?.c15t ?? {}),
		...(config.c15t ?? {}),
	} as ConsentConfig;
};

// A plain handler — NOT defineCachedEventHandler. The manifest is geo- and
// language-independent, so the backend cache headers can be forwarded verbatim.
export const createManifestRoute = function createManifestRoute(
	dependencies: RouteDependencies
) {
	return defineEventHandler(async (event) => {
		const runtimeConfig = dependencies.useRuntimeConfig(event);
		const config = readConsentConfig(runtimeConfig);
		const url = getRequestURL(event);
		const manifest = await fetchCachedManifest({
			config,
			fetch: dependencies.fetch,
			onBackgroundRevalidate: bindBackgroundRevalidate(dependencies, event),
			query: url.searchParams.toString(),
		});

		setResponseHeader(event, 'content-type', 'application/json');
		for (const header of MANIFEST_PASSTHROUGH_HEADERS) {
			const value = manifest.headers[header];
			if (value) {
				setResponseHeader(event, header, value);
			}
		}
		// Downstream caches count the remaining lifetime, not a fresh TTL.
		setResponseHeader(event, 'age', getManifestAge(manifest));

		const { etag } = manifest.headers;
		if (etag && getRequestHeader(event, 'if-none-match') === etag) {
			setResponseStatus(event, 304);
			return sendNoContent(event, 304);
		}

		return manifest.manifest;
	});
};

/** Longest request-supplied budget honoured, in milliseconds. */
const MAX_REQUEST_TIMEOUT_MS = 10_000;

/**
 * The budget the server render asked for with {@link C15T_TIMEOUT_HEADER},
 * or `undefined` when the request carries none (a browser's own init).
 */
const readRequestTimeoutMs = function readRequestTimeoutMs(
	value: string | undefined
): number | undefined {
	if (value === undefined || !/^\d+$/u.test(value.trim())) {
		return undefined;
	}
	return Math.min(Number.parseInt(value.trim(), 10), MAX_REQUEST_TIMEOUT_MS);
};

/**
 * Whether a failed manifest read may fall back to backend `/init`. It may for
 * a backend that has no `/manifest` (404) and for the request that saw the
 * failure itself. It may not when the render budget ran out, or while the
 * key is backing off after a failure: sending every one of those requests to
 * `/init` would put the load the backoff removes back on the same backend.
 */
const canFallBackToInit = function canFallBackToInit(cause: unknown): boolean {
	if (!(cause instanceof ManifestUnavailableError)) {
		return true;
	}
	if (cause.reason === 'timeout') {
		return false;
	}
	return (cause.cause as { status?: unknown } | undefined)?.status === 404;
};

const negotiateInit = function negotiateInit(
	output: InitOutput,
	clientContract: string | undefined
): InitOutput {
	const negotiated = { ...output };
	if (
		clientContract !== undefined &&
		parsePolicyContractHeader(clientContract) !== POLICY_CONTRACT_VERSION
	) {
		negotiated.policyResolution = writePolicyResolutionWire({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
	}
	if (
		readPolicyResolutionWire(negotiated.policyResolution).status !== 'matched'
	) {
		delete negotiated.policySnapshotToken;
		delete negotiated.gvl;
		delete negotiated.gvlReference;
		delete negotiated.cmpId;
		delete negotiated.customVendors;
	}
	return negotiated;
};

export const createInitRoute = function createInitRoute(
	dependencies: RouteDependencies
) {
	return defineEventHandler(async (event) => {
		const runtimeConfig = dependencies.useRuntimeConfig(event);
		const config = readConsentConfig(runtimeConfig);
		setResponseHeader(event, 'cache-control', 'private, no-store');
		setResponseHeader(
			event,
			POLICY_CONTRACT_HEADER,
			String(POLICY_CONTRACT_VERSION)
		);
		const headers = getRequestHeaders(event);

		try {
			const manifest = await fetchCachedManifest({
				config,
				fetch: dependencies.fetch,
				onBackgroundRevalidate: bindBackgroundRevalidate(dependencies, event),
				timeoutMs: readRequestTimeoutMs(headers[C15T_TIMEOUT_HEADER]),
			});
			const load = (language: string) =>
				manifest.manifest.iab?.gvl
					? fetchCachedGvl({
							fetch: dependencies.fetch as typeof globalThis.fetch,
							language,
							url: manifest.manifest.iab.gvl.url,
						})
					: Promise.resolve(null);
			const listResponse = await serveGvlReference(
				new Request(getRequestURL(event)),
				load
			);
			if (listResponse) {
				return sendWebResponse(event, listResponse);
			}
			const inputs = getResolverInputsFromHeaders(headers);
			const payload = negotiateInit(
				resolveManifestInit({ inputs, manifest: manifest.manifest }),
				getRequestHeader(event, POLICY_CONTRACT_HEADER)
			);
			if (
				payload.policyResolution.status === 'matched' &&
				payload.policyResolution.policy.model === 'iab' &&
				manifest.manifest.iab?.enabled
			) {
				payload.gvl = await load(
					payload.translations.language.split('-')[0] || 'en'
				);
			}
			if (config.reportSessions !== false) {
				reportConsentSession({
					adapter: '@c15t/vue',
					backendURL: resolveSessionReportBackendURL({
						backendURL: config.backendURL,
					}),
					fetch: dependencies.fetch as typeof globalThis.fetch,
					headers,
					init: payload,
					inputs,
					manifest: manifest.manifest,
					method: event.method,
					source: 'route',
					waitUntil: bindBackgroundRevalidate(dependencies, event),
				});
			}
			return deferInitGvlToRoute(payload, getRequestURL(event).pathname);
		} catch (cause) {
			// Older backends may not expose /manifest; fall back to GET /init
			// through the same fetch adapter so relative backend URLs work.
			if (!config.backendURL || !canFallBackToInit(cause)) {
				throw cause;
			}
			const forward: Record<string, string> = { ...c15tProtocolHeaders };
			for (const key of [
				'accept-language',
				'sec-gpc',
				'x-c15t-gpc',
				'x-c15t-country',
				'x-c15t-region',
				'cf-ipcountry',
				'x-vercel-ip-country',
				'x-vercel-ip-country-region',
				'x-amz-cf-ipcountry',
			]) {
				const value = headers[key];
				if (value) {
					forward[key] = value;
				}
			}
			const response = await dependencies.fetch(
				joinURL(config.backendURL, '/init'),
				{
					headers: forward,
				}
			);
			if (!response.ok) {
				throw cause;
			}
			const payload = (await response.json()) as InitOutput;
			const declaration = response.headers.get(POLICY_CONTRACT_HEADER);
			const producerContract =
				declaration === null
					? undefined
					: (parsePolicyContractHeader(declaration) ?? null);
			const mapped = mapInitOutputToInitResponse(payload, forward, {
				producerContract,
			});
			// Rebuild the canonical output. Unknown upstream fields must
			// not keep stale policy evidence alongside the new outcome.
			const output = {
				branding: payload.branding,
				cmpId: mapped.cmpId,
				customVendors: mapped.customVendors,
				gvl: mapped.gvl,
				gvlReference: mapped.gvlReference,
				jurisdiction: payload.jurisdiction,
				location: payload.location,
				policyResolution: writePolicyResolutionWire(
					readPolicyResolutionWire(mapped.policyResolution)
				),
				policySnapshotToken: mapped.policySnapshotToken,
				subjectId: mapped.subjectId,
				translations: payload.translations,
			};
			return negotiateInit(
				output,
				getRequestHeader(event, POLICY_CONTRACT_HEADER)
			);
		}
	});
};
