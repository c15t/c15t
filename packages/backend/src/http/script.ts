/**
 * `GET /c15t.js` — the script-tag build, pre-configured for this backend.
 *
 * A page-builder site pastes one tag pointing here and gets the banner
 * with this instance's manifest already inlined, so a location-independent
 * policy renders without a second request. The bundle itself comes from
 * `@c15t/browser`; this module only prepends a queued `config` call.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

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
 * @returns The origin plus any mount prefix, without a trailing slash.
 */
export const deriveBackendURL = function deriveBackendURL(
	requestURL: string,
	routePath: string
): string {
	const url = new URL(requestURL);
	const pathname = url.pathname.endsWith(routePath)
		? url.pathname.slice(0, -routePath.length)
		: url.pathname;
	return `${url.origin}${pathname}`.replace(/\/+$/u, '');
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
}

/** A script response. */
export interface ScriptResult {
	readonly body: string;
	readonly etag: string;
	readonly cacheControl: string;
}

/**
 * Build the script body: a queued `config` call carrying this backend's
 * manifest, then the bundle.
 *
 * @param request - Variant, manifest config and caller context.
 * @returns The body with its cache headers.
 * @throws {Error} When the bundle cannot be read.
 */
export const buildScriptResponse = async function buildScriptResponse(
	request: ScriptRequest
): Promise<ScriptResult> {
	const { bundle } = request;
	const manifest = await buildConsentManifestFromConfig(request.manifest);
	const defaults = {
		...request.options.config,
		backendURL: request.backendURL,
		manifest: request.language
			? sliceConsentManifestLanguage(manifest, request.language)
			: manifest,
		mode: 'manifest',
	};
	// Queued at the *front* of `window.c15t`, so anything the page pushed
	// before the tag replays after it and wins over the baked-in defaults.
	// A page that already holds the API (the tag loaded twice) gets a
	// plain `config()` call instead.
	const prelude = `(function(c){window.c15t=window.c15t||[];Array.isArray(window.c15t)?window.c15t.unshift(["config",c]):window.c15t.config(c)})(${toInlineJson(defaults)});\n`;
	return {
		body: `${prelude}${bundle}`,
		cacheControl: createManifestCacheControl(request.cache),
		// The prelude hash covers the manifest revision, the backend URL and
		// `script.config` and bundle bytes, so every representation change invalidates.
		etag: `"${createHash('sha256').update(prelude).update(bundle).digest('hex').slice(0, 32)}.${request.variant}.${bundle.length}"`,
	};
};
