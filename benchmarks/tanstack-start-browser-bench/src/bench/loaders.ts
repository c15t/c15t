import {
	createConsentConfigHandler,
	mergeInitIntoConsentConfig,
	readInitialConsentConfig,
} from '@c15t/tanstack-start/server';
import type { ConsentConfig } from '@c15t/tanstack-start/server';
import { createServerFn } from '@tanstack/react-start';

import { BENCH_BACKEND_URL, getBenchManifestURL } from './manifest-url';

type InitPayload = Parameters<typeof mergeInitIntoConsentConfig>[1];

/**
 * Direct-init prefetch for the `ssr` arm. The package's
 * `createConsentConfigHandler({ backendURL })` always resolves init from
 * the in-process manifest cache, which would pay `C15T_BENCH_INIT_LATENCY_MS`
 * once per cache fill instead of once per request. The Next arm's `ssr`
 * route calls `${backendURL}/init` server-side on every render, so this
 * loader does the same with the public helpers: read cookies and headers,
 * fetch `/init` with `cache: 'no-store'`, fold the payload in.
 */
const fetchDirectInit = async function fetchDirectInit(
	request: Request,
	base: ConsentConfig
): Promise<InitPayload | null> {
	const headers: Record<string, string> = { accept: 'application/json' };
	const cookie = request.headers.get('cookie');
	if (cookie) {
		headers.cookie = cookie;
	}
	const overrides = base.initialOverrides ?? {};
	if (overrides.country) {
		headers['x-c15t-country'] = overrides.country;
	}
	if (overrides.region) {
		headers['x-c15t-region'] = overrides.region;
	}
	if (overrides.language) {
		headers['accept-language'] = overrides.language;
	}
	if (overrides.gpc !== undefined) {
		headers['sec-gpc'] = overrides.gpc ? '1' : '0';
	}

	const response = await fetch(
		new URL(`${BENCH_BACKEND_URL}/init`, request.url),
		{ cache: 'no-store', headers, method: 'GET' }
	);
	if (!response.ok) {
		return null;
	}
	return (await response.json()) as InitPayload;
};

export const getDirectInitConsentConfig = createServerFn({
	method: 'GET',
}).handler(async () => {
	const { getRequest } = await import('@tanstack/react-start/server');
	const request = getRequest();
	const base = await readInitialConsentConfig({ request });
	try {
		const init = await fetchDirectInit(request, base);
		return init ? mergeInitIntoConsentConfig(base, init) : base;
	} catch {
		// Silent degradation, like the package helper: the client runs init.
		return base;
	}
});

/**
 * Manifest prefetch for the `manifest-ssr` arms. `manifestURL` points at
 * the fixture manifest (with the cold token when set), the same source URL
 * the `/api/c15t/$` mounts use, so the loader and the routes share one
 * in-process cache entry. The Next arm reaches the same cache by fetching
 * its own `/api/c15t/manifest` route over HTTP; Start's prefetch refuses
 * self-fetches, so it reads the cache directly instead.
 */
export const getManifestConsentConfig = createServerFn({
	method: 'GET',
}).handler(
	createConsentConfigHandler({
		backendURL: BENCH_BACKEND_URL,
		manifestURL: getBenchManifestURL(),
	})
);
