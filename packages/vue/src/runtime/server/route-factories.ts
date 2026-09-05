import { c15tProtocolHeaders, mapInitOutputToInitResponse } from '@c15t/core';
import type { InitOutput } from '@c15t/schema/types';
import {
	parsePolicyContractHeader,
	readPolicyResolutionWire,
	writePolicyResolutionWire,
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
} from '@c15t/schema/types';
import {
	defineEventHandler,
	getRequestHeader,
	getRequestHeaders,
	getRequestURL,
	sendNoContent,
	setResponseHeader,
	setResponseStatus,
} from 'h3';
import type { EventHandlerRequest, H3Event } from 'h3';
import { joinURL } from 'ufo';

import type { ConsentConfig } from '../config';
import { fetchCachedManifest, resolveManifestInit } from './manifest-mode';
import type { ManifestFetch } from './manifest-mode';

interface C15TNitroRuntimeConfig {
	c15t?: Record<string, unknown>;
	public?: {
		c15t?: Record<string, unknown>;
	};
}

type RuntimeConfigReader = (event?: H3Event<EventHandlerRequest>) => unknown;

type CachedEventHandler = (
	handler: (event: H3Event<EventHandlerRequest>) => Promise<unknown>,
	options: {
		maxAge: number;
		name: string;
		shouldBypassCache: () => boolean;
		varies: string[];
	}
) => unknown;

interface RouteDependencies {
	fetch: ManifestFetch;
	useRuntimeConfig: RuntimeConfigReader;
}

interface InitRouteDependencies extends RouteDependencies {
	defineCachedEventHandler: CachedEventHandler;
}

// `vary` is deliberately NOT forwarded. This route sends no request headers
// upstream and returns no CORS headers downstream, so its body is a pure
// function of the request URL. The backend's `Vary: Origin` would only
// fragment the edge cache for no benefit.
const PASSTHROUGH_HEADERS = [
	'cache-control',
	'etag',
	'last-modified',
	'content-language',
] as const;

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
			query: url.searchParams.toString(),
		});

		setResponseHeader(event, 'content-type', 'application/json');
		for (const header of PASSTHROUGH_HEADERS) {
			const value = manifest.headers[header];
			if (value) {
				setResponseHeader(event, header, value);
			}
		}

		const { etag } = manifest.headers;
		if (etag && getRequestHeader(event, 'if-none-match') === etag) {
			setResponseStatus(event, 304);
			return sendNoContent(event, 304);
		}

		return manifest.manifest;
	});
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
		delete negotiated.cmpId;
		delete negotiated.customVendors;
	}
	return negotiated;
};

export const createInitRoute = function createInitRoute(
	dependencies: InitRouteDependencies
) {
	return dependencies.defineCachedEventHandler(
		async (event) => {
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
				});
				return negotiateInit(
					resolveManifestInit({ headers, manifest: manifest.manifest }),
					getRequestHeader(event, POLICY_CONTRACT_HEADER)
				);
			} catch (cause) {
				// Older backends may not expose /manifest; fall back to GET /init
				// through the same fetch adapter so relative backend URLs work.
				if (!config.backendURL) {
					throw cause;
				}
				const forward: Record<string, string> = { ...c15tProtocolHeaders };
				for (const key of [
					'accept-language',
					'sec-gpc',
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
		},
		{
			maxAge: 0,
			name: 'c15t-nuxt-init',
			shouldBypassCache: () => true,
			varies: [
				'accept-language',
				'sec-gpc',
				'x-c15t-country',
				'x-c15t-region',
				'cf-ipcountry',
				'x-vercel-ip-country',
				'x-vercel-ip-country-region',
				'x-amz-cf-ipcountry',
				'x-country-code',
				'x-region-code',
			],
		}
	);
};
