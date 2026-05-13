import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { stripTrailingSlashes } from '../_shared/script-url';

declare global {
	interface Window {
		posthog: {
			init: (
				token: string,
				options: {
					api_host: string;
					ui_host?: string;
					autocapture?: boolean;
					[key: string]: unknown;
				}
			) => void;
			opt_in_capturing: () => void;
			opt_out_capturing: () => void;
			get_explicit_consent_status: () => string;
			capture: (event: string, properties?: Record<string, unknown>) => void;
		};
	}
}

const DEFAULT_API_HOST = 'https://eu.i.posthog.com';
const DEFAULT_SCRIPT_URL = 'https://eu-assets.i.posthog.com/static/array.js';
const DEFAULT_UI_HOST = 'https://eu.posthog.com';
const DEFAULTS_DATE = '2026-01-30';

export type PosthogRegion = 'eu' | 'us';
export type PosthogLoadMode = 'always' | 'after-consent' | 'disabled';

interface PosthogHostProfile {
	apiHost: string;
	uiHost: string;
	scriptUrl: string;
}

const REGION_HOSTS = {
	eu: {
		apiHost: DEFAULT_API_HOST,
		uiHost: DEFAULT_UI_HOST,
		scriptUrl: DEFAULT_SCRIPT_URL,
	},
	us: {
		apiHost: 'https://us.i.posthog.com',
		uiHost: 'https://us.posthog.com',
		scriptUrl: 'https://us-assets.i.posthog.com/static/array.js',
	},
} as const satisfies Record<PosthogRegion, PosthogHostProfile>;

function normalizeHost(host: string): string {
	return stripTrailingSlashes(host);
}

function regionFromHost(host: string): PosthogRegion | undefined {
	const normalized = normalizeHost(host);
	if (/^https:\/\/(app|us|us-assets)(\.i)?\.posthog\.com$/i.test(normalized)) {
		return 'us';
	}

	if (/^https:\/\/(eu|eu-assets)(\.i)?\.posthog\.com$/i.test(normalized)) {
		return 'eu';
	}
}

function deriveScriptUrlFromApiHost(apiHost: string): string {
	const normalized = normalizeHost(apiHost);
	const region = regionFromHost(normalized);
	if (region) {
		return REGION_HOSTS[region].scriptUrl;
	}

	return `${normalized}/static/array.js`;
}

/**
 * Resolves the PostHog host profile from helper options.
 *
 * Precedence is:
 * 1. Explicit `options.apiHost`, `options.uiHost`, and `options.scriptUrl`.
 * 2. Region inferred from an explicit `apiHost` via `regionFromHost` and
 *    `REGION_HOSTS`.
 * 3. `REGION_HOSTS[options.region ?? 'eu']` defaults.
 *
 * `options` is a `PosthogConsentOptions` object with optional string host
 * fields; the returned `PosthogHostProfile` always contains string `apiHost`,
 * `uiHost`, and `scriptUrl` values. `apiHost` and `uiHost` are always
 * normalized with `normalizeHost`. `undefined` values select defaults; `null`
 * is not supported by the option types and should not be passed.
 *
 * For custom `apiHost` values that do not match known PostHog Cloud regions,
 * `uiHost` uses an explicitly selected region when present and otherwise
 * defaults to the normalized `apiHost`. When `scriptUrl` is omitted, an explicit
 * `apiHost` derives it with `deriveScriptUrlFromApiHost`; otherwise the
 * selected region default script URL is used.
 *
 * @example
 * `{ region: 'us' }` resolves US API, UI, and bootstrap script hosts.
 * @example
 * `{ apiHost: 'https://us.i.posthog.com/' }` normalizes the API host and
 * derives the US bootstrap script URL.
 * @example
 * `{ apiHost: 'https://events.example.com' }` resolves UI to the same custom
 * host and script URL to `https://events.example.com/static/array.js`.
 */
function resolvePosthogHosts(
	options: PosthogConsentOptions
): PosthogHostProfile {
	const regionDefaults = REGION_HOSTS[options.region ?? 'eu'];
	const apiHost = normalizeHost(options.apiHost ?? regionDefaults.apiHost);
	const inferredRegion = regionFromHost(apiHost);
	let uiHost: string;
	if (options.uiHost !== undefined) {
		uiHost = options.uiHost;
	} else if (inferredRegion) {
		uiHost = REGION_HOSTS[inferredRegion].uiHost;
	} else if (options.region !== undefined) {
		uiHost = REGION_HOSTS[options.region].uiHost;
	} else {
		uiHost = apiHost;
	}

	let scriptUrl: string;
	if (options.scriptUrl !== undefined) {
		scriptUrl = options.scriptUrl;
	} else if (options.apiHost !== undefined) {
		scriptUrl = deriveScriptUrlFromApiHost(apiHost);
	} else {
		scriptUrl = regionDefaults.scriptUrl;
	}

	return {
		apiHost,
		uiHost: normalizeHost(uiHost),
		scriptUrl,
	};
}

/**
 * PostHog vendor manifest.
 *
 * By default, PostHog manages its own consent internally via
 * opt_in/opt_out capturing. The helper can also gate loading until
 * measurement consent is granted.
 */
export const posthogManifest = {
	...vendorManifestContract,
	vendor: 'posthog',
	category: 'measurement',
	alwaysLoad: true,
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'posthog',
			value: {},
			ifUndefined: true,
		},
		{
			type: 'defineGlobalMethods',
			target: 'posthog',
			methods: [
				{ name: 'init', behavior: 'noop' },
				{ name: 'capture', behavior: 'noop' },
				{ name: 'opt_in_capturing', behavior: 'noop' },
				{ name: 'opt_out_capturing', behavior: 'noop' },
				{
					name: 'get_explicit_consent_status',
					behavior: 'return',
					value: 'pending',
				},
			],
		},
	],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
			attributes: {
				crossorigin: 'anonymous',
				'data-api-host': '{{apiHost}}',
				'data-ui-host': '{{uiHost}}',
			},
		},
	],
	afterLoad: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'init',
			args: ['{{id}}', '{{initOptions}}'],
		},
	],
	onLoadGranted: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_in_capturing',
		},
	],
	onLoadDenied: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_out_capturing',
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_in_capturing',
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_out_capturing',
		},
	],
} as const satisfies VendorManifest;

export interface PosthogConsentOptions {
	/**
	 * Your posthog id, begins with 'phc_'.
	 */
	id: string;

	/**
	 * PostHog Cloud region used to derive hosts when explicit host options are not
	 * provided.
	 * @default 'eu'
	 */
	region?: PosthogRegion;

	/**
	 * Your posthog api host.
	 * @default 'https://eu.i.posthog.com'
	 */
	apiHost?: string;

	/**
	 * Your PostHog UI host. Defaults to the UI host for the selected region or
	 * inferred API host region.
	 */
	uiHost?: string;

	/** The PostHog array loader URL. */
	scriptUrl?: string;

	/**
	 * How c15t should load the PostHog script.
	 *
	 * - `always`: load immediately and synchronize consent through PostHog APIs.
	 * - `after-consent`: wait for measurement consent before loading PostHog.
	 * - `disabled`: return an inert callback-only script with no network request.
	 *
	 * @default 'always'
	 */
	loadMode?: PosthogLoadMode;

	/** PostHog init options passed to `posthog.init(...)`. */
	initOptions?: Record<string, unknown>;
}

/**
 * Creates a c15t PostHog script helper.
 *
 * The `posthog()` helper uses `region` to resolve the PostHog API, UI, and
 * bootstrap script hosts. By default, `loadMode: 'always'` loads PostHog
 * immediately and syncs consent with `posthog.opt_in_capturing()` or
 * `posthog.opt_out_capturing()`.
 *
 * With `loadMode: 'after-consent'`, the script is consent-gated and c15t calls
 * `posthog.opt_in_capturing()` or `posthog.opt_out_capturing()` after load
 * based on the user's measurement consent. With `loadMode: 'disabled'`, no
 * PostHog script is loaded and no `posthog.opt_in_capturing()` or
 * `posthog.opt_out_capturing()` calls are made.
 *
 * Edge case: `loadMode: 'disabled'` skips consent-related flows entirely; use it
 * only when consumers manage PostHog loading and consent externally.
 *
 * @see https://posthog.com/docs/libraries/js#opt-in-capturing
 *
 * @param options - Optional configuration for the PostHog consent script
 * @returns The Posthog script
 */
export function posthog(options: PosthogConsentOptions): Script {
	if (options.loadMode === 'disabled') {
		return {
			id: 'posthog',
			category: 'measurement',
			callbackOnly: true,
		};
	}

	const { apiHost, uiHost, scriptUrl } = resolvePosthogHosts(options);
	const resolved = resolveManifest(posthogManifest, {
		id: options.id,
		apiHost,
		uiHost,
		scriptUrl,
		initOptions: {
			defaults: DEFAULTS_DATE,
			cookieless_mode: 'on_reject',
			...options.initOptions,
			api_host: apiHost,
			ui_host: uiHost,
		},
	});

	if (options.loadMode === 'after-consent') {
		resolved.alwaysLoad = undefined;
	}

	return resolved;
}
