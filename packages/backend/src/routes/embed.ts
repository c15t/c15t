/**
 * Embed route - Serves script-tag bootstrap payload.
 *
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { createMemoryCacheAdapter } from '~/cache/adapters/memory';
import { createCacheKey } from '~/cache/keys';
import { buildInitPayload } from '~/handlers/init/payload';
import type { C15TContext, C15TOptions, EmbedBootstrapPayload } from '~/types';
import { withCacheSpan } from '~/utils/instrumentation';
import { getMetrics } from '~/utils/metrics';

type EmbedPreloadComponent = NonNullable<
	NonNullable<EmbedBootstrapPayload['options']['componentHints']>['preload']
>[number];

const IAB_PRELOAD_COMPONENTS: EmbedPreloadComponent[] = [
	'iabBanner',
	'iabDialog',
];
const RUNTIME_BASE_FILENAME = 'c15t-embed.runtime.iife.js';
const RUNTIME_FULL_FILENAME = 'c15t-embed.runtime-full.iife.js';
const EMBED_CACHE_VERSION = 'v1';
const EMBED_CACHE_NAMESPACE = 'embed-script';
const EMBED_MEMORY_TTL_MS = 5 * 60 * 1000;
const EMBED_EXTERNAL_TTL_MS = 10 * 60 * 1000;

type RuntimeVariant = 'base' | 'full';

type CachedEmbedScriptEntry = {
	script: string;
};

function serializeForInlineScript(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

function sanitizeCountryOrRegion(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim().toUpperCase();
	if (!/^[A-Z0-9_-]{2,16}$/.test(normalized)) {
		return undefined;
	}

	return normalized;
}

function sanitizeLanguage(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim();
	if (!/^[A-Za-z0-9,;=._\- ]{2,128}$/.test(normalized)) {
		return undefined;
	}

	return normalized;
}

function normalizeLanguageForCache(value: string | null): string {
	if (!value) {
		return 'en';
	}

	const match = value.toLowerCase().match(/[a-z]{2,3}(?:-[a-z0-9]{2,8})?/);

	return match?.[0] ?? 'en';
}

function stableSerialize(value: unknown): string {
	if (typeof value === 'undefined') {
		return '"__undefined__"';
	}

	if (typeof value === 'function' || typeof value === 'symbol') {
		return JSON.stringify(String(value));
	}

	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
	}

	const objectValue = value as Record<string, unknown>;
	const keys = Object.keys(objectValue).sort();
	return `{${keys
		.map((key) => `${JSON.stringify(key)}:${stableSerialize(objectValue[key])}`)
		.join(',')}}`;
}

function createContentHash(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function getCacheGeoCountry(headers: Headers): string {
	return (
		sanitizeCountryOrRegion(headers.get('x-c15t-country')) ??
		sanitizeCountryOrRegion(headers.get('cf-ipcountry')) ??
		sanitizeCountryOrRegion(headers.get('x-vercel-ip-country')) ??
		sanitizeCountryOrRegion(headers.get('x-amz-cf-ipcountry')) ??
		sanitizeCountryOrRegion(headers.get('x-country-code')) ??
		'NONE'
	);
}

function getCacheGeoRegion(headers: Headers): string {
	return (
		sanitizeCountryOrRegion(headers.get('x-c15t-region')) ??
		sanitizeCountryOrRegion(headers.get('x-vercel-ip-country-region')) ??
		sanitizeCountryOrRegion(headers.get('x-region-code')) ??
		'NONE'
	);
}

function applyEmbedHeaderOverrides(request: Request): Request {
	const url = new URL(request.url);
	const country = sanitizeCountryOrRegion(url.searchParams.get('country'));
	const region = sanitizeCountryOrRegion(url.searchParams.get('region'));
	const language = sanitizeLanguage(url.searchParams.get('language'));

	if (!country && !region && !language) {
		return request;
	}

	const headers = new Headers(request.headers);

	if (country) {
		headers.set('x-c15t-country', country);
	}

	if (region) {
		headers.set('x-c15t-region', region);
	}

	if (language) {
		headers.set('accept-language', language);
	}

	return new Request(request, { headers });
}

function shouldIncludeIABComponents(
	jurisdiction: EmbedBootstrapPayload['init']['jurisdiction'],
	iabEnabled: boolean | undefined
): boolean {
	if (!iabEnabled) {
		return false;
	}

	return jurisdiction === 'GDPR' || jurisdiction === 'UK_GDPR';
}

function buildEmbedOptions(
	options: C15TOptions,
	includeIABComponents: boolean
): EmbedBootstrapPayload['options'] {
	const configuredOptions = options.advanced?.embed?.options ?? {};
	const configuredHints = configuredOptions.componentHints;
	const iabPreloadSet = new Set<EmbedPreloadComponent>(IAB_PRELOAD_COMPONENTS);
	const preloadHints = configuredHints?.preload ?? [];
	const preload = preloadHints.filter(
		(component) => !iabPreloadSet.has(component)
	);

	if (includeIABComponents) {
		preload.push(...IAB_PRELOAD_COMPONENTS);
	}

	return {
		...configuredOptions,
		componentHints: {
			...configuredHints,
			preload,
		},
	};
}

function resolveRuntimeScriptURL(
	request: Request,
	includeIABComponents: boolean
): string {
	const runtimeFilename = includeIABComponents
		? RUNTIME_FULL_FILENAME
		: RUNTIME_BASE_FILENAME;
	return new URL(`/${runtimeFilename}`, request.url).toString();
}

function buildEmbedConfigFingerprint(options: C15TOptions): string {
	const fingerprintSource = stableSerialize({
		disableGeoLocation: options.advanced?.disableGeoLocation ?? false,
		branding: options.advanced?.branding ?? 'c15t',
		revision: options.advanced?.embed?.revision ?? null,
		embedOptions: options.advanced?.embed?.options ?? null,
		iab: {
			enabled: options.advanced?.iab?.enabled ?? false,
			cmpId: options.advanced?.iab?.cmpId ?? null,
			vendorIds: options.advanced?.iab?.vendorIds ?? null,
			endpoint: options.advanced?.iab?.endpoint ?? null,
			customVendors: options.advanced?.iab?.customVendors ?? null,
		},
		customTranslationLocales: Object.keys(
			options.advanced?.customTranslations ?? {}
		).sort(),
	});

	return createContentHash(fingerprintSource).slice(0, 16);
}

function resolveEmbedCacheKey(
	request: Request,
	options: C15TOptions,
	configFingerprint: string
): string {
	const country = getCacheGeoCountry(request.headers);
	const region = getCacheGeoRegion(request.headers);
	const language = normalizeLanguageForCache(
		request.headers.get('accept-language')
	);
	const gpc = request.headers.get('sec-gpc') === '1' ? '1' : '0';
	const appName = options.appName || 'c15t';

	return createCacheKey(
		appName,
		EMBED_CACHE_NAMESPACE,
		EMBED_CACHE_VERSION,
		configFingerprint,
		country,
		region,
		language,
		gpc
	);
}

function applyEmbedResponseHeaders(c: {
	header(name: string, value: string): void;
}): void {
	c.header('content-type', 'application/javascript; charset=utf-8');
}

/**
 * Creates the embed route.
 *
 * GET /embed.js
 */
export const createEmbedRoute = (options: C15TOptions) => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();
	const memoryCache = createMemoryCacheAdapter();
	const externalCache = options.advanced?.cache?.adapter;
	const configFingerprint = buildEmbedConfigFingerprint(options);

	app.get('/', async (c) => {
		if (!options.advanced?.embed?.enabled) {
			return c.body('Not Found', 404);
		}

		const request = applyEmbedHeaderOverrides(c.req.raw);
		const cacheKey = resolveEmbedCacheKey(request, options, configFingerprint);

		const memoryHit = await withCacheSpan(
			'get',
			'memory',
			() => memoryCache.get<CachedEmbedScriptEntry>(cacheKey),
			options
		);
		if (memoryHit) {
			getMetrics()?.recordCacheHit('memory');
			applyEmbedResponseHeaders(c);
			return c.body(memoryHit.script);
		}
		getMetrics()?.recordCacheMiss('memory');

		if (externalCache) {
			const externalHit = await withCacheSpan(
				'get',
				'external',
				() => externalCache.get<CachedEmbedScriptEntry>(cacheKey),
				options
			);

			if (externalHit) {
				getMetrics()?.recordCacheHit('external');
				await withCacheSpan(
					'set',
					'memory',
					() => memoryCache.set(cacheKey, externalHit, EMBED_MEMORY_TTL_MS),
					options
				);

				applyEmbedResponseHeaders(c);
				return c.body(externalHit.script);
			}

			getMetrics()?.recordCacheMiss('external');
		}

		const initPayload = await buildInitPayload(request, options);
		const includeIABComponents = shouldIncludeIABComponents(
			initPayload.jurisdiction,
			options.advanced?.iab?.enabled
		);
		const embedOptions = buildEmbedOptions(options, includeIABComponents);
		const runtimeScriptURL = resolveRuntimeScriptURL(
			request,
			includeIABComponents
		);
		const runtimeVariant: RuntimeVariant = includeIABComponents
			? 'full'
			: 'base';

		const payload: EmbedBootstrapPayload = {
			init: initPayload,
			options: embedOptions,
			revision: options.advanced?.embed?.revision,
		};

		// Record init metric for embed bootstrap path.
		const gpc = request.headers.get('sec-gpc') === '1';
		getMetrics()?.recordInit({
			jurisdiction: initPayload.jurisdiction,
			country: initPayload.location?.countryCode ?? undefined,
			region: initPayload.location?.regionCode ?? undefined,
			gpc,
		});

		const script = `;(() => {
  const runtimeSrc = ${serializeForInlineScript(runtimeScriptURL)};
  const runtimeVariant = ${serializeForInlineScript(runtimeVariant)};
  const initializeAndBootstrap = () => {
    window.c15tEmbedBundle?.initializeEmbedRuntime?.();
    window.c15tEmbed?.bootstrap?.();
  };
  const ensureRuntimeLoaded = () => {
    initializeAndBootstrap();
    if (window.c15tEmbed?.bootstrap) {
      return;
    }

    const existing = document.querySelector('script[data-c15t-embed-runtime="true"]');
    if (existing instanceof HTMLScriptElement) {
      existing.addEventListener('load', initializeAndBootstrap, { once: true });
      existing.addEventListener('error', () => {}, { once: true });
      return;
    }

    const runtimeScript = document.createElement('script');
    runtimeScript.async = true;
    runtimeScript.src = runtimeSrc;
    runtimeScript.setAttribute('data-c15t-embed-runtime', 'true');
    runtimeScript.setAttribute('data-c15t-embed-runtime-variant', runtimeVariant);
    runtimeScript.addEventListener('load', initializeAndBootstrap, { once: true });
    runtimeScript.addEventListener('error', () => {}, { once: true });

    (document.head || document.body || document.documentElement).appendChild(runtimeScript);
  };

  window.__c15tEmbedPayload = ${serializeForInlineScript(payload)};
  window.dispatchEvent(new Event('c15t:embed:payload'));
  ensureRuntimeLoaded();
})();\n`;

		const cacheEntry: CachedEmbedScriptEntry = {
			script,
		};

		await withCacheSpan(
			'set',
			'memory',
			() => memoryCache.set(cacheKey, cacheEntry, EMBED_MEMORY_TTL_MS),
			options
		);

		if (externalCache) {
			await withCacheSpan(
				'set',
				'external',
				() => externalCache.set(cacheKey, cacheEntry, EMBED_EXTERNAL_TTL_MS),
				options
			);
		}

		applyEmbedResponseHeaders(c);

		return c.body(cacheEntry.script);
	});

	return app;
};
