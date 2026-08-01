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

// `vary` is deliberately NOT forwarded. This route sends no request headers
// upstream and returns no CORS headers downstream, so its body is a pure
// function of the request URL. The backend's `Vary: Origin` (paired with an
// `Access-Control-Allow-Origin` we do not pass through) would only fragment
// the edge cache for no benefit.
const PASSTHROUGH_HEADERS = [
	'cache-control',
	'etag',
	'last-modified',
	'content-language',
] as const;

// A plain handler — NOT defineCachedEventHandler. The manifest is
// geo- and language-independent, so the backend already serves it with
// `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` and an ETag;
// forwarding those verbatim lets Vercel's CDN cache the document at the edge.
// nitro's cached-handler wrapper instead stamped its own `max-age=1` over the
// backend header and emitted `Vary: Accept-Language`, both of which defeated
// edge caching. Function-level dedupe of the upstream fetch is handled by the
// in-process cache in `fetchCachedManifest`, which falls back to a short TTL
// (`MANIFEST_DEDUPE_TTL_SECONDS`) for backends that send no `s-maxage`.
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

	const etag = manifest.headers.etag;
	if (etag && getRequestHeader(event, 'if-none-match') === etag) {
		setResponseStatus(event, 304);
		return sendNoContent(event, 304);
	}

	return manifest.manifest;
});
