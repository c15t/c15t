/**
 * Live probe definitions for built-in `@c15t/scripts` integrations.
 *
 * Each entry pairs a registry vendor with safe placeholder configuration and
 * the checks used by the live monitor. This module is imported by the Node
 * runner and bundled into the browser harness, so check callbacks run inside
 * the probed page.
 *
 * Placeholder ids must be obviously fake and must never point at a real
 * account. Collection endpoints are blocked by the runner, so probes cannot
 * send real analytics data even when a vendor runtime initializes.
 */

import { linkedinInsights } from '../src/vendors/ads-and-pixels/linkedin-insights';
import { metaPixel } from '../src/vendors/ads-and-pixels/meta-pixel';
import { microsoftUet } from '../src/vendors/ads-and-pixels/microsoft-uet';
import { redditPixel } from '../src/vendors/ads-and-pixels/reddit-pixel';
import { snapchatPixel } from '../src/vendors/ads-and-pixels/snapchat-pixel';
import { tiktokPixel } from '../src/vendors/ads-and-pixels/tiktok-pixel';
import { xPixel } from '../src/vendors/ads-and-pixels/x-pixel';
import { adobeAnalytics } from '../src/vendors/analytics/adobe-analytics';
import { ahrefsAnalytics } from '../src/vendors/analytics/ahrefs-analytics';
import {
	AMPLITUDE_QUEUE_METHODS,
	amplitude,
} from '../src/vendors/analytics/amplitude';
import { clearbit } from '../src/vendors/analytics/clearbit';
import { cloudflareWebAnalytics } from '../src/vendors/analytics/cloudflare-web-analytics';
import { databuddy } from '../src/vendors/analytics/databuddy';
import { fathomAnalytics } from '../src/vendors/analytics/fathom-analytics';
import { gtag } from '../src/vendors/analytics/google-tag';
import { HEAP_QUEUE_METHODS, heap } from '../src/vendors/analytics/heap';
import {
	HIGHTOUCH_QUEUE_METHODS,
	hightouch,
} from '../src/vendors/analytics/hightouch';
import { hotjar } from '../src/vendors/analytics/hotjar';
import { logRocket } from '../src/vendors/analytics/logrocket';
import { matomoAnalytics } from '../src/vendors/analytics/matomo-analytics';
import { clarity } from '../src/vendors/analytics/microsoft-clarity';
import { mixpanelAnalytics } from '../src/vendors/analytics/mixpanel-analytics';
import { pirsch } from '../src/vendors/analytics/pirsch';
import { plausibleAnalytics } from '../src/vendors/analytics/plausible-analytics';
import { posthog } from '../src/vendors/analytics/posthog';
import { promptwatch } from '../src/vendors/analytics/promptwatch';
import {
	RUDDERSTACK_QUEUE_METHODS,
	rudderstack,
} from '../src/vendors/analytics/rudderstack';
import { rybbitAnalytics } from '../src/vendors/analytics/rybbit-analytics';
import { segment } from '../src/vendors/analytics/segment';
import { umamiAnalytics } from '../src/vendors/analytics/umami-analytics';
import { vercelAnalytics } from '../src/vendors/analytics/vercel-analytics';
import { crisp } from '../src/vendors/functional/crisp';
import { intercom } from '../src/vendors/functional/intercom';
import { googleTagManager } from '../src/vendors/tag-managers/google-tag-manager';
import type { LiveProbeCheckResult, LiveVendorProbeConfig } from './types';

const check = function check(
	ok: boolean,
	detail: string
): LiveProbeCheckResult {
	return { detail, ok };
};

type PromptwatchWindow = Window & {
	pwc?: unknown;
};

type MatomoWindow = Window & {
	Matomo?: {
		getTracker?: unknown;
	};
};

type GoogleTagWindow = Window & {
	google_tag_data?: {
		ics?: {
			usedDefault?: boolean;
		};
	};
};

type MetaPixelRuntime = Window['fbq'] & {
	callMethod?: unknown;
	loaded?: boolean;
	version?: string;
};

type TikTokWindow = Window & {
	TiktokAnalyticsObject?: string;
};

type UetWindow = Window & {
	UET?: unknown;
};

type XPixelRuntime = Window['twq'] & {
	exe?: unknown;
	queue?: unknown[];
};

type AdobeAnalyticsWindow = Window & {
	adobeDataLayer?: unknown[];
};

type AmplitudeWindow = Window & {
	amplitude?: {
		_q?: {
			name: string;
			args: unknown[];
			resolve: (value: unknown) => void;
		}[];
		_iq?: Record<string, unknown>;
		invoked?: boolean;
		Identify?: new () => {
			_q?: {
				name: string;
				args: unknown[];
			}[];
			set: (property: string, value: unknown) => unknown;
		};
		init?: (...args: unknown[]) => unknown;
		track?: (...args: unknown[]) => unknown;
		identify?: (...args: unknown[]) => unknown;
		setUserId?: (...args: unknown[]) => unknown;
		setOptOut?: (...args: unknown[]) => unknown;
		flush?: (...args: unknown[]) => unknown;
	};
};

type LogRocketWindow = Window & {
	LogRocket?: {
		init?: unknown;
		identify?: unknown;
		track?: unknown;
		getSessionURL?: unknown;
		start?: unknown;
		startNewSession?: unknown;
		uninstall?: unknown;
	};
};

type HightouchWindow = Window & {
	htevents?: {
		initialized?: boolean;
		[key: string]: unknown;
	};
};

type HeapWindow = Window & {
	heap?: {
		appid?: string;
		clientConfig?: Record<string, unknown>;
		envId?: string;
		serverConfig?: {
			sdk?: {
				version?: string;
			};
		};
		getSessionId?: (...args: unknown[]) => unknown;
		track?: (...args: unknown[]) => unknown;
		[key: string]: unknown;
	};
	heapReadyCb?: {
		name: string;
		fn: () => void;
	}[];
};

type RudderStackWindow = Window & {
	rudderanalytics?: {
		load?: unknown;
		page?: unknown;
		track?: unknown;
		snippetExecuted?: boolean;
		[key: string]: unknown;
	};
};

/**
 * Probe configs for every built-in integration, ordered by registry vendor id.
 */
export const liveVendorProbeConfigs: LiveVendorProbeConfig[] = [
	{
		bootstrapCheck: () => {
			const { dataLayer } = window;

			if (!Array.isArray(dataLayer)) {
				return check(false, 'expected window.dataLayer array before load');
			}

			return check(
				dataLayer.length > 0,
				`dataLayer seeded with ${dataLayer.length} entries before load`
			);
		},
		createScript: () => googleTagManager({ id: 'GTM-C15TFAKE' }),
		deniedConsentProbe: {
			// Google Consent Mode's cookieless pings are consent-safe by design;
			// only real collection endpoints and ad-storage cookies are
			// violations. Weak until a real container id lands as a repo secret
			// (placeholder ids 404 before any tag can run).
			collectUrlSubstrings: [
				'google-analytics.com/g/collect',
				'analytics.google.com/g/collect',
				'doubleclick.net',
			],
			storagePrefixes: ['_ga', '_gid', '_gcl'],
		},
		loaderUrlSubstring: 'googletagmanager.com/gtm.js',
		notes:
			'Placeholder container ids return HTTP 404 from googletagmanager.com; runtime is not asserted.',

		// GTM only serves container JS for real container ids, so a placeholder
		// id proves bootstrap and endpoint reachability but not runtime behavior.
		tier: 'loader-only',
		vendor: 'google-tag-manager',
	},
	{
		bootstrapCheck: () => {
			const { dataLayer } = window;

			if (!Array.isArray(dataLayer)) {
				return check(false, 'expected window.dataLayer array before load');
			}

			return check(
				dataLayer.length >= 3,
				`dataLayer seeded with ${dataLayer.length} entries before load`
			);
		},
		createScript: () => gtag({ category: 'measurement', id: 'G-C15TFAKE' }),
		deniedConsentProbe: {
			// Consent Mode's cookieless pings (gcs=G100) are consent-safe by
			// design, so /g/collect is deliberately NOT a violation here; the
			// assertion is that no ad requests fire and no Google cookies are
			// written while consent is denied.
			collectUrlSubstrings: ['doubleclick.net', 'googleadservices.com'],
			storagePrefixes: ['_ga', '_gid', '_gcl'],
		},
		loaderUrlSubstring: 'googletagmanager.com/gtag/js',
		runtimeCheck: () => {
			const consentState = (window as GoogleTagWindow).google_tag_data?.ics;

			return check(
				consentState?.usedDefault === true,
				'google_tag_data consent state observed after gtag loader executed'
			);
		},
		tier: 'full',
		vendor: 'gtag',
	},
	{
		createScript: () => ahrefsAnalytics({ key: 'C15TFAKE' }),
		loaderUrlSubstring: 'analytics.ahrefs.com/analytics.js',
		runtimeCheck: () =>
			check(
				typeof window.AhrefsAnalytics?.sendEvent === 'function',
				'window.AhrefsAnalytics.sendEvent present after loader executed'
			),
		tier: 'full',
		vendor: 'ahrefs-analytics',
	},
	{
		bootstrapCheck: () => {
			const adobeWindow = window as AdobeAnalyticsWindow;

			return check(
				Array.isArray(adobeWindow.adobeDataLayer),
				'window.adobeDataLayer array seeded before load'
			);
		},
		createScript: () =>
			adobeAnalytics({
				scriptUrl:
					'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
			}),
		loaderUrlSubstring:
			'assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		notes:
			'Placeholder Adobe Tags embed paths return HTTP 404 from assets.adobedtm.com; runtime globals such as window._satellite require a real property.',

		// Adobe Tags embed URLs are property-specific. Placeholder paths on the
		// real host return 404 and can be ORB-filtered by Chromium, so the probe
		// validates consent gating, bootstrap, and endpoint reachability only.
		// Full-tier coverage needs a real Launch property embed URL from a repo
		// secret as a follow-up.
		tier: 'loader-only',
		vendor: 'adobe-analytics',
	},
	{
		bootstrapCheck: () => {
			const amplitudeRuntime = (window as AmplitudeWindow).amplitude;

			if (!amplitudeRuntime?._q || !Array.isArray(amplitudeRuntime._q)) {
				return check(false, 'expected window.amplitude._q queue array');
			}

			const hasMethods = AMPLITUDE_QUEUE_METHODS.every(
				(method) => typeof amplitudeRuntime[method] === 'function'
			);

			amplitudeRuntime.track?.('c15t live probe', {
				vendor: 'amplitude',
			});
			const identify = amplitudeRuntime.Identify
				? new amplitudeRuntime.Identify().set('probe', true)
				: undefined;
			if (identify) {
				amplitudeRuntime.identify?.(identify);
			}

			const queuedNames = amplitudeRuntime._q.map((entry) => entry.name);

			return check(
				hasMethods &&
					amplitudeRuntime.invoked === true &&
					JSON.stringify(amplitudeRuntime._iq) === JSON.stringify({}) &&
					queuedNames.includes('init') &&
					queuedNames.includes('track') &&
					queuedNames.includes('identify'),
				'amplitude method-call queue, invoked marker, _iq registry, init, pre-load track, and pre-load identify present before load'
			);
		},
		createScript: () =>
			amplitude({
				apiKey: 'C15TFAKEAMPLITUDEKEY',
				initOptions: {
					autocapture: false,
					defaultTracking: false,
					fetchRemoteConfig: false,
				},
			}),
		loaderUrlSubstring: 'cdn.amplitude.com/libs/analytics-browser-',
		notes:
			'The probe allows only the CDN loader. Follow-up Amplitude collection or remote-config requests are blocked by the runner with empty 204 responses.',
		runtimeCheck: () => {
			const amplitudeRuntime = (window as AmplitudeWindow).amplitude;
			const flushResult = amplitudeRuntime?.flush?.();
			const hasFlushPromise =
				typeof flushResult === 'object' &&
				flushResult !== null &&
				'promise' in flushResult;

			return check(
				typeof amplitudeRuntime?.init === 'function' &&
					typeof amplitudeRuntime.track === 'function' &&
					typeof amplitudeRuntime.setOptOut === 'function' &&
					Array.isArray(amplitudeRuntime._q) &&
					amplitudeRuntime._q.length === 0 &&
					hasFlushPromise,
				'amplitude SDK methods present after load, snippet queue drained, and flush returned an SDK promise wrapper'
			);
		},
		tier: 'full',
		vendor: 'amplitude',
	},
	{
		createScript: () =>
			cloudflareWebAnalytics({
				token: 'c15tfake000000000000000000000000',
			}),
		loaderUrlSubstring: 'static.cloudflareinsights.com/beacon.min.js',
		runtimeCheck: () =>
			check(
				window.__cfBeacon?.token === 'c15tfake000000000000000000000000',
				'window.__cfBeacon token present after loader executed'
			),
		tier: 'full',
		vendor: 'cloudflare-web-analytics',
	},
	{
		createScript: () => clearbit({ publishableKey: 'pk_c15tfake' }),
		loaderUrlSubstring: 'tag.clearbitscripts.com/v1/pk_c15tfake/tags.js',
		notes:
			'Placeholder publishable keys return HTTP 404 JavaScript from tag.clearbitscripts.com; runtime globals are not asserted.',

		// Clearbit returns JavaScript with an "Invalid tags.js configuration:
		// 404" console error for placeholder publishable keys, so the probe
		// validates consent gating and endpoint reachability but not runtime.
		tier: 'loader-only',
		vendor: 'clearbit',
	},
	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	{
		vendor: 'microsoft-clarity',
		// Real project id: Clarity ids are public by nature (visible in the
		// page source of every site using Clarity) and the runner blocks all
		// collect endpoints, so probes send no analytics data to the project.
		// A real id means the tag serves the real runtime — full tier.
		tier: 'full',
		createScript: () => clarity({ id: 'xin9eohwfp' }),
		loaderUrlSubstring: 'clarity.ms/tag/',
		// The tag chain-loads the versioned runtime bundle from
		// scripts.clarity.ms; collect endpoints stay blocked.
		allowUrlSubstrings: ['clarity.ms/s/', 'scripts.clarity.ms/'],
		runtimeReplacedGlobals: ['clarity'],
		bootstrapCheck: () => {
			const stub = window.clarity as
				| (Window['clarity'] & { v?: unknown })
				| undefined;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.clarity stub function');
			}

			// The stub must NOT carry the runtime version marker: clarity.js
			// refuses to start when `v` is pre-set ("Error CL001: Multiple
			// Clarity tags detected") — the production bug fixed in #898.
			if (stub.v !== undefined) {
				return check(
					false,
					`stub carries v=${String(stub.v)}; clarity.js treats this as a duplicate install (CL001) and never starts`
				);
			}

			const firstCall = stub.q?.[0];
			const isConsentV2 =
				Array.isArray(firstCall) && firstCall[0] === 'consentv2';

			return check(
				isConsentV2,
				'clarity queue seeded with a consentv2 call before load'
			);
		},
		runtimeCheck: () => {
			const runtime = window.clarity as
				| (Window['clarity'] & { v?: unknown })
				| undefined;

			// clarity.js assigns `v` only after the real runtime replaces the
			// queued stub — its presence proves the runtime actually started.
			return check(
				typeof runtime === 'function' && typeof runtime.v === 'string',
				'clarity runtime installed and stamped its version after load'
			);
		},
	},
	{
		bootstrapCheck: () =>
			check(
				window.databuddyConfig?.clientId === 'db_c15tfake',
				'databuddyConfig seeded before load'
			),
		createScript: () =>
			databuddy({
				clientId: 'db_c15tfake',
				configWhenDenied: {
					clientId: 'db_c15tfake',
					disabled: true,
				},

				configWhenGranted: {
					clientId: 'db_c15tfake',
					disabled: false,
				},
			}),
		deniedConsentProbe: {
			// configWhenDenied sets disabled: true, so the SDK must send nothing
			// to Databuddy's collection API while consent is denied.
			collectUrlSubstrings: ['basket.databuddy.cc', 'api.databuddy.cc'],
		},
		loaderUrlSubstring: 'cdn.databuddy.cc/databuddy.js',
		runtimeCheck: () =>
			check(
				typeof window.databuddy?.track === 'function',
				'window.databuddy.track present after loader executed'
			),
		tier: 'full',
		vendor: 'databuddy',
	},
	{
		createScript: () => fathomAnalytics({ site: 'C15TFAKE' }),
		loaderUrlSubstring: 'cdn.usefathom.com/script.js',
		runtimeCheck: () =>
			check(
				typeof window.fathom?.trackPageview === 'function',
				'window.fathom.trackPageview present after loader executed'
			),
		tier: 'full',
		vendor: 'fathom-analytics',
	},
	{
		allowUrlSubstrings: ['cdn.us.heap-api.com/v5/'],
		bootstrapCheck: () => {
			const heapWindow = window as HeapWindow;
			const heapRuntime = heapWindow.heap;

			if (!Array.isArray(heapRuntime)) {
				return check(false, 'expected window.heap queue array before load');
			}

			const hasMethods = HEAP_QUEUE_METHODS.every(
				(method) => typeof heapRuntime[method] === 'function'
			);

			heapRuntime.track?.('c15t live probe', {
				vendor: 'heap',
			});
			const queuedNames = heapWindow.heapReadyCb?.map((entry) => entry.name);

			return check(
				hasMethods &&
					heapRuntime.envId === '123456789' &&
					heapRuntime.appid === '123456789' &&
					heapRuntime.clientConfig?.shouldFetchServerConfig === false &&
					queuedNames?.includes('track') === true,
				'heap callback queue, env id, client config, and pre-load track callback present before load'
			);
		},
		createScript: () =>
			heap({
				clientConfig: {
					disableSessionReplay: true,
					disableTextCapture: true,
					logLevel: 'none',
				},

				envId: '123456789',
			}),
		loaderUrlSubstring: 'cdn.us.heap-api.com/config/123456789/heap_config.js',
		notes:
			'The probe allows the Heap config loader and chained heap.js bundle. Follow-up collection requests to c.us.heap-api.com are blocked by the runner with empty 204 responses.',
		runtimeCheck: () => {
			const heapRuntime = (window as HeapWindow).heap;

			return check(
				typeof heapRuntime?.track === 'function' &&
					typeof heapRuntime.getSessionId === 'function' &&
					typeof heapRuntime.serverConfig?.sdk?.version === 'string',
				'heap SDK methods and server config present after heap_config.js chain-loaded heap.js'
			);
		},
		tier: 'full',
		vendor: 'heap',
	},
	{
		bootstrapCheck: () => {
			const { mixpanel } = window;

			if (!Array.isArray(mixpanel)) {
				return check(false, 'expected window.mixpanel queue array');
			}

			if (mixpanel.__SV !== 1.2 || !Array.isArray(mixpanel._i)) {
				return check(
					false,
					'expected snippet contract (__SV and _i) on the stub before load'
				);
			}

			return check(
				typeof mixpanel.track === 'function' &&
					typeof mixpanel.opt_out_tracking === 'function',
				'mixpanel snippet contract and queue methods present before load'
			);
		},
		createScript: () =>
			mixpanelAnalytics({
				initOptions: {
					api_host: 'https://api-js.mixpanel.com',
					opt_out_tracking_by_default: true,
				},

				token: 'c15fc15fc15fc15fc15fc15fc15fc15f',
			}),
		deniedConsentProbe: {
			// Denied consent replays opt_out_tracking through the queue, and the
			// probe's initOptions set opt_out_tracking_by_default so the SDK
			// never persists before that call lands — the configuration our docs
			// recommend for alwaysLoad usage. The live SDK must produce zero
			// collection traffic and no mp_* storage. Mixpanel's
			// __mp_opt_in_out_* opt-out marker is legitimate consent-state
			// storage and intentionally not a violation prefix.
			collectUrlSubstrings: ['api-js.mixpanel.com', 'api.mixpanel.com'],
			storagePrefixes: ['mp_'],
		},
		loaderUrlSubstring: 'cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		runtimeCheck: () => {
			const runtime = window.mixpanel as
				| (Window['mixpanel'] & {
						__loaded?: boolean;
				  })
				| undefined;

			return check(
				runtime?.__loaded === true,
				'mixpanel SDK reports __loaded after init_from_snippet'
			);
		},
		tier: 'full',
		vendor: 'mixpanel-analytics',
	},
	{
		bootstrapCheck: () => {
			const stub = window.hj;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.hj stub function');
			}

			return check(
				window._hjSettings?.hjid === '123456789',
				'hotjar settings seeded before load'
			);
		},
		createScript: () => hotjar({ siteId: '123456789', version: 6 }),
		loaderUrlSubstring: 'static.hotjar.com/c/hotjar-123456789.js',
		notes:
			'Placeholder site ids return an empty 200 JavaScript response from static.hotjar.com; runtime is not asserted.',

		// Hotjar answers unknown site ids with an empty JavaScript response, so
		// the probe verifies the account-keyed endpoint but cannot assert runtime.
		tier: 'loader-only',
		vendor: 'hotjar',
	},
	{
		bootstrapCheck: () => {
			const { htevents } = window as HightouchWindow;

			if (!Array.isArray(htevents)) {
				return check(false, 'expected window.htevents queue array');
			}

			const hasMethods = HIGHTOUCH_QUEUE_METHODS.every(
				(method) => typeof htevents[method] === 'function'
			);

			return check(
				hasMethods &&
					htevents._writeKey === 'C15TFAKE' &&
					JSON.stringify(htevents._loadOptions) ===
						JSON.stringify({ apiHost: 'us-east-1.hightouch-events.com' }),
				'hightouch queue methods, write key, and load options present before load'
			);
		},
		createScript: () =>
			hightouch({
				apiHost: 'us-east-1.hightouch-events.com',

				writeKey: 'C15TFAKE',
			}),
		loaderUrlSubstring:
			'cdn.hightouch-events.com/browser/release/v1-latest/events.min.js',
		notes:
			'The probe allows only the CDN loader. Follow-up collection requests to hightouch-events.com are blocked by the runner with empty 204 responses.',
		runtimeCheck: () => {
			const { htevents } = window as HightouchWindow;

			return check(
				Array.isArray(htevents) === false &&
					htevents?.initialized === true &&
					typeof htevents.track === 'function' &&
					typeof htevents.page === 'function',
				'window.htevents replaced with initialized runtime after loader executed'
			);
		},
		tier: 'full',
		vendor: 'hightouch',
	},
	{
		createScript: () =>
			logRocket({
				appId: 'c15tfake/c15tfake',
				initOptions: {
					dom: {
						inputSanitizer: true,
						textSanitizer: true,
					},
				},
			}),
		loaderUrlSubstring: 'cdn.logrocket.io/LogRocket.min.js',
		notes:
			'The probe allows only the SDK loader. Follow-up logger/ingest/API requests are blocked by the runner with empty 204 responses.',
		runtimeCheck: () => {
			const runtime = (window as LogRocketWindow).LogRocket;

			return check(
				typeof runtime?.init === 'function' &&
					typeof runtime.identify === 'function' &&
					typeof runtime.track === 'function' &&
					typeof runtime.getSessionURL === 'function' &&
					typeof runtime.start === 'function' &&
					typeof runtime.startNewSession === 'function' &&
					typeof runtime.uninstall === 'function',
				'window.LogRocket init/identify/track/getSessionURL/start/startNewSession/uninstall present after loader executed'
			);
		},
		tier: 'full',
		vendor: 'logrocket',
	},
	{
		bootstrapCheck: () =>
			check(
				Array.isArray(window._paq) && window._paq.length >= 5,
				`matomo queue seeded with ${window._paq?.length ?? 0} entries before load`
			),
		createScript: () =>
			matomoAnalytics({
				cloudId: 'c15t-live-probe',
				defaultConsent: 'required',
				disableCookies: true,
				enableLinkTracking: true,
				siteId: '999999',
			}),
		deniedConsentProbe: {
			// defaultConsent 'required' queues requireConsent before load, so no
			// matomo.php tracker hit and no _pk_* cookies may appear while
			// consent is denied. Weak until a real cloud id lands as a secret
			// (placeholder ids 404 before the tracker can run).
			collectUrlSubstrings: ['matomo.php'],
			storagePrefixes: ['_pk_'],
		},
		loaderUrlSubstring: 'cdn.matomo.cloud/c15t-live-probe/matomo.js',
		notes:
			'Placeholder Matomo Cloud ids return HTTP 404 from cdn.matomo.cloud; runtime is not asserted.',

		runtimeCheck: () => {
			const matomo = (window as MatomoWindow).Matomo;

			return check(
				typeof matomo?.getTracker === 'function',
				'window.Matomo.getTracker present after loader executed'
			);
		},
		// Matomo is self-hosted or account-hosted; the default public-cloud path
		// for a fake cloud id returns 404, so this only proves the derived loader.
		tier: 'loader-only',
		vendor: 'matomo-analytics',
	},
	{
		// array.js chain-loads versioned SDK bundles from the same assets host.
		allowUrlSubstrings: ['assets.i.posthog.com/static/'],
		bootstrapCheck: () => {
			const stub = window.posthog;

			if (!stub || typeof stub.init !== 'function') {
				return check(false, 'expected window.posthog stub with init()');
			}

			return check(
				stub.get_explicit_consent_status() === 'pending',
				'posthog stub reports pending consent before load'
			);
		},
		createScript: () =>
			posthog({
				id: 'phc_c15tliveprobe000000000000000000000000000000000',
				loadMode: 'after-consent',
			}),
		loaderUrlSubstring: 'assets.i.posthog.com/static/array.js',
		runtimeCheck: () => {
			const sdk = window.posthog as
				| (Window['posthog'] & { __loaded?: boolean })
				| undefined;

			return check(
				sdk?.__loaded === true,
				'posthog SDK reports __loaded after init'
			);
		},

		tier: 'full',
		vendor: 'posthog',
	},
	{
		createScript: () =>
			promptwatch({
				projectId: '00000000-0000-4000-8000-c15c15c15c15',
			}),
		loaderUrlSubstring: 'ingest.promptwatch.com/js/client.min.js',
		runtimeCheck: () =>
			check(
				typeof (window as PromptwatchWindow).pwc === 'object' &&
					(window as PromptwatchWindow).pwc !== null,
				'window.pwc present after loader executed'
			),
		tier: 'full',
		vendor: 'promptwatch',
	},
	{
		createScript: () =>
			pirsch({
				dev: 'c15t-live-probe.invalid',

				identificationCode: 'c15t-live-probe',
			}),
		loaderUrlSubstring: 'api.pirsch.io/pa.js',
		notes:
			'The probe uses data-dev to avoid Pirsch localhost suppression; the runner blocks the pageview hit request with an empty 204.',
		runtimeCheck: () =>
			check(
				typeof window.pirsch === 'function' &&
					typeof window.pirschInit === 'function',
				'window.pirsch and window.pirschInit present after loader executed'
			),
		tier: 'full',
		vendor: 'pirsch',
	},
	{
		bootstrapCheck: () => {
			const { rudderanalytics } = window as RudderStackWindow;

			if (!Array.isArray(rudderanalytics)) {
				return check(false, 'expected window.rudderanalytics queue array');
			}

			const hasMethods = RUDDERSTACK_QUEUE_METHODS.every(
				(method) => typeof rudderanalytics[method] === 'function'
			);

			return check(
				hasMethods &&
					rudderanalytics.snippetExecuted === true &&
					window.RudderSnippetVersion === '3.0.32' &&
					window.rudderAnalyticsBuildType === 'modern',
				'rudderstack queue methods and snippet globals present before load'
			);
		},
		// Probes the opt-in pre-consent mode — the riskier surface, since the
		// SDK loads for every visitor. The default blocked-load mode is covered
		// by the jsdom contract tests. The fake data plane host doubles as the
		// collection violation list: any request to it under denied consent
		// proves the buffered pre-consent state leaked.
		createScript: () =>
			rudderstack({
				consentManagement: {
					mapping: {
						marketing: ['c15t-marketing'],
						measurement: ['c15t-measurement'],
					},
				},
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				writeKey: 'C15TFAKE',
			}),
		deniedConsentProbe: {
			collectUrlSubstrings: ['c15t-live-probe.invalid'],
			notes:
				'Pre-consent mode: the SDK loads inert with buffered delivery and storage strategy none; any data-plane request or rl_* storage under denied consent is a violation.',

			// rl_* covers cookies; rudder* covers the SDK's localStorage keys
			// (rudder_<writeKey> batch queues and friends).
			storagePrefixes: ['rl_', 'rudder'],
		},
		loaderUrlSubstring: 'cdn.rudderlabs.com/v3/modern/rsa.min.js',
		notes:
			'The probe allows only the CDN loader. The fake data plane is intentionally invalid and follow-up requests are blocked by the runner with empty 204 responses.',

		runtimeCheck: () => {
			const { rudderanalytics } = window as RudderStackWindow;

			return check(
				Array.isArray(rudderanalytics) === false &&
					typeof rudderanalytics?.load === 'function' &&
					typeof rudderanalytics.page === 'function' &&
					typeof rudderanalytics.track === 'function',
				'window.rudderanalytics replaced with runtime methods after loader executed'
			);
		},
		tier: 'full',
		vendor: 'rudderstack',
	},
	{
		bootstrapCheck: () => {
			const { analytics } = window;

			if (!Array.isArray(analytics)) {
				return check(false, 'expected window.analytics queue array');
			}

			return check(
				typeof analytics.track === 'function' &&
					typeof analytics.page === 'function',
				'segment queue methods present before load'
			);
		},
		createScript: () => segment({ writeKey: 'C15TFAKE' }),
		loaderUrlSubstring:
			'cdn.segment.com/analytics.js/v1/C15TFAKE/analytics.min.js',
		notes:
			'Placeholder write keys return HTTP 404 from cdn.segment.com; runtime is not asserted.',

		// Segment keys are embedded in the loader URL and fake write keys return
		// HTTP 404, so this probe stops at bootstrap plus endpoint reachability.
		tier: 'loader-only',
		vendor: 'segment',
	},
	{
		createScript: () =>
			rybbitAnalytics({
				siteId: 'c15t-live-probe',
				trackSpa: true,
			}),
		loaderUrlSubstring: 'app.rybbit.io/api/script.js',
		runtimeCheck: () =>
			check(
				typeof window.rybbit?.pageview === 'function',
				'window.rybbit.pageview present after loader executed'
			),
		tier: 'full',
		vendor: 'rybbit-analytics',
	},
	{
		bootstrapCheck: () => {
			const stub = window.plausible;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.plausible stub function');
			}

			return check(
				Array.isArray(stub.q),
				'plausible stub queue present before load'
			);
		},
		createScript: () =>
			plausibleAnalytics({ domain: 'c15t-live-probe.invalid' }),
		loaderUrlSubstring: 'plausible.io/js/script.js',
		runtimeCheck: () =>
			check(
				typeof window.plausible === 'function',
				'window.plausible callable after loader executed'
			),
		runtimeReplacedGlobals: ['plausible'],
		tier: 'full',
		vendor: 'plausible-analytics',
	},
	{
		createScript: () =>
			umamiAnalytics({
				websiteId: '00000000-0000-4000-8000-c15c15c15c15',
			}),
		loaderUrlSubstring: 'cloud.umami.is/script.js',
		runtimeCheck: () =>
			check(
				typeof window.umami?.track === 'function',
				'window.umami.track present after loader executed'
			),
		tier: 'full',
		vendor: 'umami-analytics',
	},
	{
		bootstrapCheck: () => {
			const { va } = window;

			if (typeof va !== 'function') {
				return check(false, 'expected window.va stub function');
			}

			return check(
				Array.isArray(window.vaq),
				'vercel queue present before load'
			);
		},
		createScript: () =>
			vercelAnalytics({
				dsn: 'https://c15t-live-probe.invalid',
			}),
		loaderUrlSubstring: 'va.vercel-scripts.com/v1/script.js',
		runtimeCheck: () =>
			check(
				typeof window.va === 'function',
				'window.va callable after loader executed'
			),

		// script.js serves real JS but leaves the va stub untouched outside a
		// real Vercel deployment context; runtime is not observable with
		// placeholder config.
		tier: 'loader-only',
		vendor: 'vercel-analytics',
	},
	{
		// Crisp chain-loads widget assets after the bootstrap client runs.
		allowUrlSubstrings: ['client.crisp.chat/'],
		bootstrapCheck: () =>
			check(
				Array.isArray(window.$crisp) &&
					window.CRISP_WEBSITE_ID === '00000000-0000-4000-8000-c15c15c15c15',
				'crisp queue and website id seeded before load'
			),
		createScript: () =>
			crisp({
				safeMode: true,
				websiteId: '00000000-0000-4000-8000-c15c15c15c15',
			}),
		loaderUrlSubstring: 'client.crisp.chat/l.js',
		runtimeCheck: () =>
			check(
				Array.isArray(window.$crisp),
				'window.$crisp queue remains available after loader executed'
			),

		// l.js loads for any website id but the client keeps the $crisp queue
		// untouched for placeholder ids; runtime needs a real website id
		// (repo-secret follow-up).
		tier: 'loader-only',
		vendor: 'crisp',
	},
	{
		// The widget loader pulls its runtime from Intercom's CDN path.
		allowUrlSubstrings: ['js.intercomcdn.com/'],
		bootstrapCheck: () => {
			const stub = window.Intercom;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.Intercom stub function');
			}

			return check(
				window.intercomSettings?.app_id === 'c15tfake',
				'intercomSettings seeded before load'
			);
		},
		createScript: () => intercom({ appId: 'c15tfake' }),
		loaderUrlSubstring: 'widget.intercom.io/widget/c15tfake',
		runtimeCheck: () =>
			check(
				typeof window.Intercom === 'function',
				'window.Intercom callable after loader executed'
			),

		// The widget bootstrap serves real JS for any app id but boots nothing
		// observable for placeholder ids, so runtime cannot be asserted without
		// a real workspace id (repo-secret follow-up).
		tier: 'loader-only',
		vendor: 'intercom',
	},
	{
		bootstrapCheck: () => {
			const stub = window.fbq as MetaPixelRuntime | undefined;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.fbq stub function');
			}

			return check(
				stub.loaded === true && stub.version === '2.0',
				'meta pixel stub metadata present before load'
			);
		},
		createScript: () => metaPixel({ pixelId: '123456789012345' }),
		loaderUrlSubstring: 'connect.facebook.net/en_US/fbevents.js',
		runtimeCheck: () =>
			check(
				typeof (window.fbq as MetaPixelRuntime | undefined)?.callMethod ===
					'function',
				'fbq.callMethod present after loader executed'
			),
		tier: 'full',
		vendor: 'meta-pixel',
	},
	{
		bootstrapCheck: () => {
			const stub = window.rdt;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.rdt stub function');
			}

			return check(
				Array.isArray(stub.callQueue) && stub.callQueue.length >= 2,
				'reddit pixel queue seeded before load'
			);
		},
		createScript: () => redditPixel({ pixelId: 't2_c15tfake' }),
		loaderUrlSubstring: 'redditstatic.com/ads/pixel.js',
		runtimeCheck: () =>
			check(
				typeof window.rdt?.sendEvent === 'function',
				'rdt.sendEvent present after loader executed'
			),
		tier: 'full',
		vendor: 'reddit-pixel',
	},
	{
		bootstrapCheck: () => {
			const queue = window.ttq;

			if (!Array.isArray(queue)) {
				return check(false, 'expected window.ttq queue array');
			}

			return check(
				(window as TikTokWindow).TiktokAnalyticsObject === 'ttq' &&
					typeof queue.grantConsent === 'function',
				'tiktok queue methods present before load'
			);
		},
		createScript: () => tiktokPixel({ pixelId: 'C15TFAKE' }),
		loaderUrlSubstring: 'analytics.tiktok.com/i18n/pixel/events.js',
		runtimeCheck: () => {
			const queue = window.ttq as
				| (Window['ttq'] & { _env?: unknown; _plugins?: unknown })
				| undefined;

			// events.js decorates the queue object with runtime metadata even for
			// placeholder pixel ids — a marker the pre-load stub never has.
			return check(
				queue !== undefined &&
					(queue._env !== undefined || queue._plugins !== undefined),
				'ttq decorated with runtime metadata after events.js executed'
			);
		},
		tier: 'full',
		vendor: 'tiktok-pixel',
	},
	{
		bootstrapCheck: () =>
			check(
				window._linkedin_partner_id === '123456789' &&
					window._linkedin_data_partner_ids?.includes('123456789') === true &&
					typeof window.lintrk === 'function',
				'linkedin partner globals and lintrk stub seeded before load'
			),
		createScript: () => linkedinInsights({ id: '123456789' }),
		loaderUrlSubstring: 'snap.licdn.com/li.lms-analytics/insight.min.js',
		runtimeCheck: () =>
			check(
				typeof window.lintrk === 'function',
				'window.lintrk callable after loader executed'
			),

		// insight.min.js serves real JS but initializes nothing observable for
		// placeholder partner ids; runtime needs a real partner id
		// (repo-secret follow-up).
		tier: 'loader-only',
		vendor: 'linkedin-insights',
	},
	{
		bootstrapCheck: () =>
			check(
				Array.isArray(window.uetq) && window.uetq.length > 0,
				'microsoft uet consent queue seeded before load'
			),
		createScript: () => microsoftUet({ id: '123456789' }),
		deniedConsentProbe: {
			// The queued consent default denies ad storage, so UET must not fire
			// action beacons (bat.bing.com/action/...) or write _uet* cookies
			// while consent is denied. The /p/action/{tag}.js request is the
			// per-tag config script — a resource fetch, not a data beacon — and
			// is deliberately not a violation.
			collectUrlSubstrings: ['bat.bing.com/action'],
			storagePrefixes: ['_uet'],
		},
		loaderUrlSubstring: 'bat.bing.com/bat.js',
		runtimeCheck: () =>
			check(
				typeof (window as UetWindow).UET === 'function' &&
					typeof window.uetq?.push === 'function',
				'UET constructor and queue push present after loader executed'
			),
		tier: 'full',
		vendor: 'microsoft-uet',
	},
	{
		bootstrapCheck: () => {
			const stub = window.snaptr;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.snaptr stub function');
			}

			return check(
				window._snaptr === stub &&
					stub.loaded === true &&
					stub.version === '1.0',
				'snapchat pixel stub metadata present before load'
			);
		},
		createScript: () => snapchatPixel({ pixelId: '123456789012345' }),
		loaderUrlSubstring: 'sc-static.net/scevent.min.js',
		runtimeCheck: () =>
			check(
				typeof window.snaptr?.handleRequest === 'function',
				'snaptr.handleRequest present after loader executed'
			),
		tier: 'full',
		vendor: 'snapchat-pixel',
	},
	{
		bootstrapCheck: () => {
			const stub = window.twq as XPixelRuntime | undefined;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.twq stub function');
			}

			return check(
				Array.isArray(stub.queue) && stub.queue.length > 0,
				'x pixel queue seeded before load'
			);
		},
		createScript: () => xPixel({ pixelId: 'o0000' }),
		loaderUrlSubstring: 'static.ads-twitter.com/uwt.js',
		runtimeCheck: () =>
			check(
				typeof (window.twq as XPixelRuntime | undefined)?.exe === 'function',
				'twq.exe present after loader executed'
			),
		tier: 'full',
		vendor: 'x-pixel',
	},
];

/**
 * Looks up the live probe config for a vendor id.
 */
export const getLiveVendorProbeConfig = function getLiveVendorProbeConfig(
	vendor: string
): LiveVendorProbeConfig | undefined {
	return liveVendorProbeConfigs.find((config) => config.vendor === vendor);
};
