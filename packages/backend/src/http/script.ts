/**
 * `GET /c15t.js` — the script-tag build, pre-configured for this backend.
 *
 * A page-builder site pastes one tag pointing here and gets the banner
 * configured to resolve policy through this instance's `/init`. Headless
 * and IAB builds preload its manifest. The bundles come from
 * `@c15t/browser`; this module prepends a queued `config` call.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import type { buildPrefetchScript } from '@c15t/browser/prefetch';
import {
	buildConsentManifestFromConfig,
	sliceConsentManifestLanguage,
} from '@c15t/schema/types';
import type { ConsentManifestConfig } from '@c15t/schema/types';

import { createManifestCacheControl } from './manifest';
import type { ManifestCacheOptions } from './manifest';

/** Browser builds served by the backend. */
export const SCRIPT_BUNDLES = {
	full: 'c15t.js',
	headless: 'c15t.headless.js',
	iab: 'c15t.iab.js',
} as const;

/** Which build to serve. */
export type ScriptVariant = keyof typeof SCRIPT_BUNDLES;

/** Options for the script routes. */
export interface ScriptOptions {
	/** Register the routes. Defaults to `true`. */
	readonly enabled?: boolean;
	/** Path of the full build. Defaults to `/c15t.js`. */
	readonly path?: string;
	/** Path of the headless build. Defaults to `/c15t.headless.js`. */
	readonly headlessPath?: string;
	/** Path of the optional IAB build. Defaults to `/c15t.iab.js`. */
	readonly iabPath?: string;
	/** Path of the early init script. Defaults to `/c15t.init.js`. */
	readonly initPath?: string;
	/**
	 * Origin the script should call for `/init` and `/subjects`. Derived
	 * from the request URL when omitted, which is right unless a proxy
	 * rewrites paths on the way in.
	 */
	readonly backendURL?: string;
	/**
	 * Extra defaults baked into the script: `consentCategories`,
	 * `legalLinks`, `ui`, and so on. Anything the page queues with
	 * `c15t.push(['config', ...])` before the tag still wins.
	 */
	readonly config?: Readonly<Record<string, unknown>>;
	/**
	 * Bundle files to serve instead of the ones resolved from
	 * `@c15t/browser`, for deployments with a custom bundle location. Paths require a filesystem.
	 */
	readonly bundles?: Partial<Readonly<Record<ScriptVariant, string>>>;
	/**
	 * Start `/init` from the full script before its bundle runs, and serve the same request as `initPath` for an `async`
	 * tag. In the full script, pages that set options changing that request
	 * skip it. Defaults to `true`. Not applied to a custom `bundles.full`.
	 */
	readonly prefetch?: boolean;
}

const bundleCache = new Map<string, Promise<string>>();

const resolveBundlePath = function resolveBundlePath(
	variant: ScriptVariant,
	options: ScriptOptions
): string {
	const override = options.bundles?.[variant];
	if (override) {
		return override;
	}
	// `require.resolve` honours the package's exports map, and the bundle
	// entries are plain paths, so it lands on the published file.
	return createRequire(import.meta.url).resolve(
		`@c15t/browser/${SCRIPT_BUNDLES[variant]}`
	);
};

/**
 * Read a bundle once and keep it; the file never changes while the process
 * runs.
 *
 * @param variant - Which build.
 * @param options - Script options, for path overrides.
 * @returns The bundle source.
 */
export const loadScriptBundle = async function loadScriptBundle(
	variant: ScriptVariant,
	options: ScriptOptions = {}
): Promise<string> {
	const path = resolveBundlePath(variant, options);
	const pending = bundleCache.get(path) ?? readFile(path, 'utf8');
	bundleCache.set(path, pending);
	try {
		return await pending;
	} catch (error) {
		// A missing file must not poison every later request.
		bundleCache.delete(path);
		throw error;
	}
};

/**
 * Serialise for an inline `<script>`: `</script>` inside a string must not
 * end the element, and the two line separators are not valid in JS
 * source.
 */
const toInlineJson = function toInlineJson(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</gu, '\\u003c')
		.replace(/\u2028/gu, '\\u2028')
		.replace(/\u2029/gu, '\\u2029');
};

/**
 * Derive the backend origin the script should call from the request URL.
 *
 * `https://x.c15t.dev/api/c15t/c15t.js` served on `/c15t.js` gives
 * `https://x.c15t.dev/api/c15t`, so a backend mounted under a prefix keeps
 * working.
 *
 * @param requestURL - The absolute request URL.
 * @param routePath - The path the route is registered on.
 * @param basePath - Configured public mount path, before router dispatch strips it.
 * @returns The origin plus any mount prefix, without a trailing slash.
 */
export const deriveBackendURL = function deriveBackendURL(
	requestURL: string,
	routePath: string,
	basePath?: string
): string {
	const url = new URL(requestURL);
	// c15tInstance strips this prefix before the request reaches Hono.
	const pathname =
		basePath ||
		(url.pathname.endsWith(routePath)
			? url.pathname.slice(0, -routePath.length)
			: url.pathname);
	let end = pathname.length;
	while (end > 0 && pathname[end - 1] === '/') {
		end -= 1;
	}
	return `${url.origin}${pathname.slice(0, end)}`;
};

/** What {@link buildScriptResponse} needs. */
export interface ScriptRequest {
	readonly variant: ScriptVariant;
	/** The bundle source, from {@link loadScriptBundle}. */
	readonly bundle: string;
	readonly manifest: ConsentManifestConfig;
	readonly cache: ManifestCacheOptions | undefined;
	readonly language: string | null;
	readonly backendURL: string;
	readonly options: ScriptOptions;
	/**
	 * `buildPrefetchScript` from the `@c15t/core` the bundle was built
	 * with, from {@link loadPrefetchBuilder}. Without it the full bundle
	 * starts `/init` only after it has run.
	 */
	readonly buildPrefetch?: PrefetchBuilder;
}

/** `buildPrefetchScript` from the `@c15t/core` inside the browser bundles. */
export type PrefetchBuilder = typeof buildPrefetchScript;

type PrefetchOptions = Parameters<PrefetchBuilder>[0];

let prefetchBuilder: Promise<PrefetchBuilder | undefined> | undefined;

/**
 * Load `buildPrefetchScript` through `@c15t/browser/prefetch`, which pins
 * the `@c15t/core` built into `c15t.js`. The early request declares that
 * core's version and policy contract, and reads its storage keys, so it
 * must not come from another core. A custom `script.bundles.full` may be
 * another version, so it gets none. The specifier is a literal so server
 * bundlers and file tracers keep the module.
 *
 * @param options - Script options.
 * @returns The builder, or `undefined` when it cannot be loaded.
 */
export const loadPrefetchBuilder = function loadPrefetchBuilder(
	options: ScriptOptions = {}
): Promise<PrefetchBuilder | undefined> {
	if (options.prefetch === false || options.bundles?.full) {
		return Promise.resolve(undefined);
	}
	prefetchBuilder ??= (async () => {
		try {
			return (await import('@c15t/browser/prefetch')).buildPrefetchScript;
		} catch {
			return undefined;
		}
	})();
	return prefetchBuilder;
};

/** Tag attributes that change the first `/init`, or when it is sent. */
const EARLY_INIT_ATTRIBUTES = [
	'data-backend',
	'data-backend-url',
	'data-country',
	'data-language',
	'data-manifest-url',
	'data-manual',
	'data-mode',
	'data-policy-rules',
	'data-region',
];

/** Queued `config` options that change the first `/init`, or replace it. */
const EARLY_INIT_OPTIONS = [
	'backendURL',
	'experiment',
	'manifest',
	'manifestURL',
	'mode',
	'overrides',
	'policyRules',
	'prefetch',
	'storageConfig',
];

const readRecord = function readRecord(
	value: unknown
): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
};

/**
 * The config baked into the full script: hosted mode, plus the requested
 * language as an override.
 */
const buildHostedDefaults = function buildHostedDefaults(
	request: Pick<ScriptRequest, 'backendURL' | 'language' | 'options'>
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {
		...request.options.config,
		backendURL: request.backendURL,
		mode: 'hosted',
	};
	if (request.language) {
		defaults.overrides = {
			...readRecord(request.options.config?.overrides),
			language: request.language,
		};
	}
	return defaults;
};

/**
 * The `buildPrefetchScript` statement for the request the runtime will
 * send with this config, or `''` when the config supplies init data or the
 * builder rejects it. The script then still works and sends `/init` later.
 */
const buildPrefetchCall = function buildPrefetchCall(
	build: PrefetchBuilder,
	defaults: Record<string, unknown>
): string {
	if (defaults.prefetch !== undefined) {
		return '';
	}
	const overrides = readRecord(defaults.overrides);
	const storageKey = readRecord(defaults.storageConfig)?.storageKey;
	try {
		// Operator config is untyped JSON; the builder rejects what it can't
		// read, and the catch below keeps the script working.
		return build({
			backendURL: defaults.backendURL as string,
			experiment: defaults.experiment as PrefetchOptions['experiment'],
			overrides: overrides && {
				country: overrides.country as string | undefined,
				gpc: overrides.gpc as boolean | undefined,
				language: overrides.language as string | undefined,
				region: overrides.region as string | undefined,
			},
			storageKey: typeof storageKey === 'string' ? storageKey : undefined,
		});
	} catch {
		return '';
	}
};

/**
 * The statement that starts `/init` before the bundle runs, so the request
 * overlaps parsing and starting the bundle. The runtime takes its response
 * when it initializes. It skips pages whose tag attributes or queued
 * `config` calls would make the runtime send a different request, which
 * would leave this one unused. Index 0 of the queue is the backend's own
 * config, unshifted by the line before.
 *
 * @param build - `buildPrefetchScript` from the bundle's core.
 * @param defaults - The config baked into the script.
 * @returns One line of JavaScript, or `''`.
 */
const buildEarlyInit = function buildEarlyInit(
	build: PrefetchBuilder,
	defaults: Record<string, unknown>
): string {
	const prefetch = buildPrefetchCall(build, defaults);
	if (!prefetch) {
		return '';
	}
	return `(()=>{var q=window.c15t,s=document.currentScript;if(!Array.isArray(q))return;if(s&&${toInlineJson(EARLY_INIT_ATTRIBUTES)}.some(a=>s.hasAttribute(a)))return;if(q.slice(1).some(e=>Array.isArray(e)&&e[0]==="config"&&typeof e[1]=="object"&&e[1]!==null&&${toInlineJson(EARLY_INIT_OPTIONS)}.some(k=>k in e[1])))return;${prefetch}})();\n`;
};

/** A script response. */
export interface ScriptResult {
	readonly body: string;
	readonly etag: string;
	readonly cacheControl: string;
}

/**
 * Build the script body: hosted configuration for the full bundle, or an
 * inlined manifest for headless and IAB, followed by the bundle.
 *
 * @param request - Variant, manifest config and caller context.
 * @returns The body with its cache headers.
 * @throws {Error} When the bundle cannot be read.
 */
export const buildScriptResponse = async function buildScriptResponse(
	request: ScriptRequest
): Promise<ScriptResult> {
	const { bundle } = request;
	const defaults: Record<string, unknown> =
		request.variant === 'full'
			? buildHostedDefaults(request)
			: { ...request.options.config, backendURL: request.backendURL };
	if (request.variant !== 'full') {
		const manifest = await buildConsentManifestFromConfig(request.manifest);
		defaults.manifest = request.language
			? sliceConsentManifestLanguage(manifest, request.language)
			: manifest;
		defaults.mode = 'manifest';
	}
	// Queued at the *front* of `window.c15t`, so anything the page pushed
	// before the tag replays after it and wins over the baked-in defaults.
	// A page that already holds the API (the tag loaded twice) gets a
	// plain `config()` call instead.
	const configPrelude = `(function(c){window.c15t=window.c15t||[];Array.isArray(window.c15t)?window.c15t.unshift(["config",c]):window.c15t.config(c)})(${toInlineJson(defaults)});\n`;
	const prelude =
		request.variant === 'full' && request.buildPrefetch
			? `${configPrelude}${buildEarlyInit(request.buildPrefetch, defaults)}`
			: configPrelude;
	return {
		body: `${prelude}${bundle}`,
		cacheControl: createManifestCacheControl(request.cache),
		// The hash covers config, backend URL, any inlined manifest and
		// bundle bytes, so every representation change invalidates.
		etag: `"${createHash('sha256').update(prelude).update(bundle).digest('hex').slice(0, 32)}.${request.variant}.${bundle.length}"`,
	};
};

/** What {@link buildInitScriptResponse} needs. */
export type InitScriptRequest = Pick<
	ScriptRequest,
	'backendURL' | 'cache' | 'language' | 'options'
> & {
	readonly buildPrefetch: PrefetchBuilder;
};

/**
 * Build `/c15t.init.js`: the early `/init` from the full script on its own,
 * for an `async` tag that starts the request while `c15t.js` downloads.
 * It has no page guard, because it runs before the page's c15t tag exists.
 *
 * @param request - Builder, backend URL and caller context.
 * @returns The body with its cache headers.
 */
export const buildInitScriptResponse = function buildInitScriptResponse(
	request: InitScriptRequest
): ScriptResult {
	const body = `${buildPrefetchCall(request.buildPrefetch, buildHostedDefaults(request))}\n`;
	return {
		body,
		cacheControl: createManifestCacheControl(request.cache),
		etag: `"${createHash('sha256').update(body).digest('hex').slice(0, 32)}.init"`,
	};
};
