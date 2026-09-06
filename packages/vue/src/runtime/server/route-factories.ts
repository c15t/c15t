import {
	getManifestAge,
	MANIFEST_PASSTHROUGH_HEADERS,
} from '@c15t/core/transports/manifest-cache';
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

export const createInitRoute = function createInitRoute(
	dependencies: InitRouteDependencies
) {
	return dependencies.defineCachedEventHandler(
		async (event) => {
			const runtimeConfig = dependencies.useRuntimeConfig(event);
			const config = readConsentConfig(runtimeConfig);
			setResponseHeader(event, 'cache-control', 'private, no-store');
			const headers = getRequestHeaders(event);

			try {
				const manifest = await fetchCachedManifest({
					config,
					fetch: dependencies.fetch,
				});
				return resolveManifestInit({
					headers,
					manifest: manifest.manifest,
				});
			} catch (cause) {
				// Older backends may not expose /manifest; fall back to GET /init
				// through the same fetch adapter so relative backend URLs work.
				if (!config.backendURL) {
					throw cause;
				}
				const forward: Record<string, string> = {};
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
				return await response.json();
			}
		},
		{
			maxAge: 0,
			name: 'c15t-nuxt-init',
			shouldBypassCache: () => true,
			varies: [
				'accept-language',
				'sec-gpc',
				'x-c15t-gpc',
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
