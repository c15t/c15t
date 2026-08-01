import {
	defineEventHandler,
	getRequestHeader,
	getRequestURL,
	sendNoContent,
	setResponseHeader,
	setResponseStatus,
} from 'h3';
import { useRuntimeConfig } from 'nitropack/runtime';
import type { NitroRuntimeConfig } from 'nitropack/types';
import type { ConsentConfig } from '../config';
import { serverFetch } from './local-fetch';
import { fetchCachedManifest } from './manifest-mode';

type C15TNitroRuntimeConfig = NitroRuntimeConfig & {
	c15t?: Partial<ConsentConfig>;
	public: NitroRuntimeConfig['public'] & {
		c15t?: Partial<ConsentConfig>;
	};
};

const PASSTHROUGH_HEADERS = [
	'cache-control',
	'etag',
	'last-modified',
	'vary',
	'content-language',
] as const;

// A plain handler — NOT defineCachedEventHandler. The manifest is
// geo- and language-independent, so the backend already serves it with
// `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` and an ETag;
// forwarding those verbatim lets Vercel's CDN cache the document at the edge.
// nitro's cached-handler wrapper instead stamped its own `max-age=1` over the
// backend header and emitted `Vary: Accept-Language`, both of which defeated
// edge caching. Function-level dedupe of the upstream fetch is already handled
// by the in-process cache in `fetchCachedManifest`.
export default defineEventHandler(async (event) => {
	const runtimeConfig = useRuntimeConfig<C15TNitroRuntimeConfig>(event);
	const config = {
		...(runtimeConfig.public?.c15t ?? {}),
		...(runtimeConfig.c15t ?? {}),
	} as ConsentConfig;
	const url = getRequestURL(event);
	const manifest = await fetchCachedManifest({
		config,
		fetch: serverFetch,
		query: url.searchParams.toString(),
	});

	setResponseHeader(event, 'content-type', 'application/json');
	for (const header of PASSTHROUGH_HEADERS) {
		const value = manifest.headers[header];
		if (value) {
			setResponseHeader(event, header, value);
		}
	}

	// Fallback for older backends that serve the manifest without a
	// Cache-Control header: derive a shared-cache TTL from the parsed s-maxage
	// so the route is still edge-cacheable rather than defaulting to no-cache.
	if (!manifest.headers['cache-control'] && manifest.sMaxAge > 0) {
		setResponseHeader(
			event,
			'cache-control',
			`public, s-maxage=${manifest.sMaxAge}, stale-while-revalidate=${manifest.sMaxAge}`
		);
	}

	const etag = manifest.headers.etag;
	if (etag && getRequestHeader(event, 'if-none-match') === etag) {
		setResponseStatus(event, 304);
		return sendNoContent(event, 304);
	}

	return manifest.manifest;
});
