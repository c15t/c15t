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

function check(ok: boolean, detail: string): LiveProbeCheckResult {
	return { ok, detail };
}

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
		_q?: Array<{
			name: string;
			args: unknown[];
			resolve: (value: unknown) => void;
		}>;
		_iq?: Record<string, unknown>;
		invoked?: boolean;
		Identify?: new () => {
			_q?: Array<{
				name: string;
				args: unknown[];
			}>;
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
		vendor: 'google-tag-manager',
		// GTM only serves container JS for real container ids, so a placeholder
		// id proves bootstrap and endpoint reachability but not runtime behavior.
		tier: 'loader-only',
		createScript: () => googleTagManager({ id: 'GTM-C15TFAKE' }),
		loaderUrlSubstring: 'googletagmanager.com/gtm.js',
		bootstrapCheck: () => {
			const dataLayer = window.dataLayer;

			if (!Array.isArray(dataLayer)) {
				return check(false, 'expected window.dataLayer array before load');
			}

			return check(
				dataLayer.length > 0,
				`dataLayer seeded with ${dataLayer.length} entries before load`
			);
		},
		notes:
			'Placeholder container ids return HTTP 404 from googletagmanager.com; runtime is not asserted.',
	},
	{
		vendor: 'gtag',
		tier: 'full',
		createScript: () => gtag({ id: 'G-C15TFAKE', category: 'measurement' }),
		loaderUrlSubstring: 'googletagmanager.com/gtag/js',
		bootstrapCheck: () => {
			const dataLayer = window.dataLayer;

			if (!Array.isArray(dataLayer)) {
				return check(false, 'expected window.dataLayer array before load');
			}

			return check(
				dataLayer.length >= 3,
				`dataLayer seeded with ${dataLayer.length} entries before load`
			);
		},
		runtimeCheck: () => {
			const consentState = (window as GoogleTagWindow).google_tag_data?.ics;

			return check(
				consentState?.usedDefault === true,
				'google_tag_data consent state observed after gtag loader executed'
			);
		},
	},
	{
		vendor: 'ahrefs-analytics',
		tier: 'full',
		createScript: () => ahrefsAnalytics({ key: 'C15TFAKE' }),
		loaderUrlSubstring: 'analytics.ahrefs.com/analytics.js',
		runtimeCheck: () =>
			check(
				typeof window.AhrefsAnalytics?.sendEvent === 'function',
				'window.AhrefsAnalytics.sendEvent present after loader executed'
			),
	},
	{
		vendor: 'adobe-analytics',
		// Adobe Tags embed URLs are property-specific. Placeholder paths on the
		// real host return 404 and can be ORB-filtered by Chromium, so the probe
		// validates consent gating, bootstrap, and endpoint reachability only.
		// Full-tier coverage needs a real Launch property embed URL from a repo
		// secret as a follow-up.
		tier: 'loader-only',
		createScript: () =>
			adobeAnalytics({
				scriptUrl:
					'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
			}),
		loaderUrlSubstring:
			'assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		bootstrapCheck: () => {
			const adobeWindow = window as AdobeAnalyticsWindow;

			return check(
				Array.isArray(adobeWindow.adobeDataLayer),
				'window.adobeDataLayer array seeded before load'
			);
		},
		notes:
			'Placeholder Adobe Tags embed paths return HTTP 404 from assets.adobedtm.com; runtime globals such as window._satellite require a real property.',
	},
	{
		vendor: 'amplitude',
		tier: 'full',
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
		notes:
			'The probe allows only the CDN loader. Follow-up Amplitude collection or remote-config requests are blocked by the runner with empty 204 responses.',
	},
	{
		vendor: 'cloudflare-web-analytics',
		tier: 'full',
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
	},
	{
		vendor: 'clearbit',
		// Clearbit returns JavaScript with an "Invalid tags.js configuration:
		// 404" console error for placeholder publishable keys, so the probe
		// validates consent gating and endpoint reachability but not runtime.
		tier: 'loader-only',
		createScript: () => clearbit({ publishableKey: 'pk_c15tfake' }),
		loaderUrlSubstring: 'tag.clearbitscripts.com/v1/pk_c15tfake/tags.js',
		notes:
			'Placeholder publishable keys return HTTP 404 JavaScript from tag.clearbitscripts.com; runtime globals are not asserted.',
	},
	{
		vendor: 'microsoft-clarity',
		// clarity.ms answers unknown project ids with an empty 204, so runtime
		// behavior can only be asserted with a real project id (planned as a
		// repo-secret follow-up). Bootstrap and consent gating still run against
		// the live endpoint.
		tier: 'loader-only',
		createScript: () =>
			clarity({
				id: 'c15tfake00',
				defaultConsent: {
					ad_storage: 'denied',
					analytics_storage: 'denied',
				},
			}),
		loaderUrlSubstring: 'clarity.ms/tag/',
		allowUrlSubstrings: ['clarity.ms/s/'],
		bootstrapCheck: () => {
			const stub = window.clarity;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.clarity stub function');
			}

			if (stub.v !== '0.7.0') {
				return check(false, `expected stub version 0.7.0, got ${stub.v}`);
			}

			return check(
				Array.isArray(stub.q) && stub.q.length > 0,
				'clarity queue seeded with default consent before load'
			);
		},
		runtimeCheck: () =>
			check(
				typeof window.clarity === 'function',
				'window.clarity callable after loader executed'
			),
	},
	{
		vendor: 'databuddy',
		tier: 'full',
		createScript: () =>
			databuddy({
				clientId: 'db_c15tfake',
				configWhenGranted: {
					clientId: 'db_c15tfake',
					disabled: false,
				},
				configWhenDenied: {
					clientId: 'db_c15tfake',
					disabled: true,
				},
			}),
		loaderUrlSubstring: 'cdn.databuddy.cc/databuddy.js',
		bootstrapCheck: () =>
			check(
				window.databuddyConfig?.clientId === 'db_c15tfake',
				'databuddyConfig seeded before load'
			),
		runtimeCheck: () =>
			check(
				typeof window.databuddy?.track === 'function',
				'window.databuddy.track present after loader executed'
			),
	},
	{
		vendor: 'fathom-analytics',
		tier: 'full',
		createScript: () => fathomAnalytics({ site: 'C15TFAKE' }),
		loaderUrlSubstring: 'cdn.usefathom.com/script.js',
		runtimeCheck: () =>
			check(
				typeof window.fathom?.trackPageview === 'function',
				'window.fathom.trackPageview present after loader executed'
			),
	},
	{
		vendor: 'mixpanel-analytics',
		tier: 'full',
		createScript: () =>
			mixpanelAnalytics({
				token: 'c15fc15fc15fc15fc15fc15fc15fc15f',
				initOptions: {
					api_host: 'https://api-js.mixpanel.com',
					opt_out_tracking_by_default: true,
				},
			}),
		loaderUrlSubstring: 'cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		bootstrapCheck: () => {
			const mixpanel = window.mixpanel;

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
	},
	{
		vendor: 'hotjar',
		// Hotjar answers unknown site ids with an empty JavaScript response, so
		// the probe verifies the account-keyed endpoint but cannot assert runtime.
		tier: 'loader-only',
		createScript: () => hotjar({ siteId: '123456789', version: 6 }),
		loaderUrlSubstring: 'static.hotjar.com/c/hotjar-123456789.js',
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
		notes:
			'Placeholder site ids return an empty 200 JavaScript response from static.hotjar.com; runtime is not asserted.',
	},
	{
		vendor: 'hightouch',
		tier: 'full',
		createScript: () =>
			hightouch({
				writeKey: 'C15TFAKE',
				apiHost: 'us-east-1.hightouch-events.com',
			}),
		loaderUrlSubstring:
			'cdn.hightouch-events.com/browser/release/v1-latest/events.min.js',
		bootstrapCheck: () => {
			const htevents = (window as HightouchWindow).htevents;

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
		runtimeCheck: () => {
			const htevents = (window as HightouchWindow).htevents;

			return check(
				Array.isArray(htevents) === false &&
					htevents?.initialized === true &&
					typeof htevents.track === 'function' &&
					typeof htevents.page === 'function',
				'window.htevents replaced with initialized runtime after loader executed'
			);
		},
		notes:
			'The probe allows only the CDN loader. Follow-up collection requests to hightouch-events.com are blocked by the runner with empty 204 responses.',
	},
	{
		vendor: 'logrocket',
		tier: 'full',
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
		notes:
			'The probe allows only the SDK loader. Follow-up logger/ingest/API requests are blocked by the runner with empty 204 responses.',
	},
	{
		vendor: 'matomo-analytics',
		// Matomo is self-hosted or account-hosted; the default public-cloud path
		// for a fake cloud id returns 404, so this only proves the derived loader.
		tier: 'loader-only',
		createScript: () =>
			matomoAnalytics({
				cloudId: 'c15t-live-probe',
				defaultConsent: 'required',
				disableCookies: true,
				enableLinkTracking: true,
				siteId: '999999',
			}),
		loaderUrlSubstring: 'cdn.matomo.cloud/c15t-live-probe/matomo.js',
		bootstrapCheck: () =>
			check(
				Array.isArray(window._paq) && window._paq.length >= 5,
				`matomo queue seeded with ${window._paq?.length ?? 0} entries before load`
			),
		runtimeCheck: () => {
			const matomo = (window as MatomoWindow).Matomo;

			return check(
				typeof matomo?.getTracker === 'function',
				'window.Matomo.getTracker present after loader executed'
			);
		},
		notes:
			'Placeholder Matomo Cloud ids return HTTP 404 from cdn.matomo.cloud; runtime is not asserted.',
	},
	{
		vendor: 'posthog',
		tier: 'full',
		createScript: () =>
			posthog({
				id: 'phc_c15tliveprobe000000000000000000000000000000000',
				loadMode: 'after-consent',
			}),
		loaderUrlSubstring: 'assets.i.posthog.com/static/array.js',
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
		runtimeCheck: () => {
			const sdk = window.posthog as
				| (Window['posthog'] & { __loaded?: boolean })
				| undefined;

			return check(
				sdk?.__loaded === true,
				'posthog SDK reports __loaded after init'
			);
		},
	},
	{
		vendor: 'promptwatch',
		tier: 'full',
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
	},
	{
		vendor: 'pirsch',
		tier: 'full',
		createScript: () =>
			pirsch({
				identificationCode: 'c15t-live-probe',
				dev: 'c15t-live-probe.invalid',
			}),
		loaderUrlSubstring: 'api.pirsch.io/pa.js',
		runtimeCheck: () =>
			check(
				typeof window.pirsch === 'function' &&
					typeof window.pirschInit === 'function',
				'window.pirsch and window.pirschInit present after loader executed'
			),
		notes:
			'The probe uses data-dev to avoid Pirsch localhost suppression; the runner blocks the pageview hit request with an empty 204.',
	},
	{
		vendor: 'rudderstack',
		tier: 'full',
		createScript: () =>
			rudderstack({
				writeKey: 'C15TFAKE',
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				loadOptions: {
					useBeacon: true,
				},
			}),
		loaderUrlSubstring: 'cdn.rudderlabs.com/v3/modern/rsa.min.js',
		bootstrapCheck: () => {
			const rudderanalytics = (window as RudderStackWindow).rudderanalytics;

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
		runtimeCheck: () => {
			const rudderanalytics = (window as RudderStackWindow).rudderanalytics;

			return check(
				Array.isArray(rudderanalytics) === false &&
					typeof rudderanalytics?.load === 'function' &&
					typeof rudderanalytics.page === 'function' &&
					typeof rudderanalytics.track === 'function',
				'window.rudderanalytics replaced with runtime methods after loader executed'
			);
		},
		notes:
			'The probe allows only the CDN loader. The fake data plane is intentionally invalid and follow-up requests are blocked by the runner with empty 204 responses.',
	},
	{
		vendor: 'segment',
		// Segment keys are embedded in the loader URL and fake write keys return
		// HTTP 404, so this probe stops at bootstrap plus endpoint reachability.
		tier: 'loader-only',
		createScript: () => segment({ writeKey: 'C15TFAKE' }),
		loaderUrlSubstring:
			'cdn.segment.com/analytics.js/v1/C15TFAKE/analytics.min.js',
		bootstrapCheck: () => {
			const analytics = window.analytics;

			if (!Array.isArray(analytics)) {
				return check(false, 'expected window.analytics queue array');
			}

			return check(
				typeof analytics.track === 'function' &&
					typeof analytics.page === 'function',
				'segment queue methods present before load'
			);
		},
		notes:
			'Placeholder write keys return HTTP 404 from cdn.segment.com; runtime is not asserted.',
	},
	{
		vendor: 'rybbit-analytics',
		tier: 'full',
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
	},
	{
		vendor: 'plausible-analytics',
		tier: 'full',
		createScript: () =>
			plausibleAnalytics({ domain: 'c15t-live-probe.invalid' }),
		loaderUrlSubstring: 'plausible.io/js/script.js',
		runtimeReplacedGlobals: ['plausible'],
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
		runtimeCheck: () =>
			check(
				typeof window.plausible === 'function',
				'window.plausible callable after loader executed'
			),
	},
	{
		vendor: 'umami-analytics',
		tier: 'full',
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
	},
	{
		vendor: 'vercel-analytics',
		// script.js serves real JS but leaves the va stub untouched outside a
		// real Vercel deployment context; runtime is not observable with
		// placeholder config.
		tier: 'loader-only',
		createScript: () =>
			vercelAnalytics({
				dsn: 'https://c15t-live-probe.invalid',
			}),
		loaderUrlSubstring: 'va.vercel-scripts.com/v1/script.js',
		bootstrapCheck: () => {
			const va = window.va;

			if (typeof va !== 'function') {
				return check(false, 'expected window.va stub function');
			}

			return check(
				Array.isArray(window.vaq),
				'vercel queue present before load'
			);
		},
		runtimeCheck: () =>
			check(
				typeof window.va === 'function',
				'window.va callable after loader executed'
			),
	},
	{
		vendor: 'crisp',
		// l.js loads for any website id but the client keeps the $crisp queue
		// untouched for placeholder ids; runtime needs a real website id
		// (repo-secret follow-up).
		tier: 'loader-only',
		createScript: () =>
			crisp({
				safeMode: true,
				websiteId: '00000000-0000-4000-8000-c15c15c15c15',
			}),
		loaderUrlSubstring: 'client.crisp.chat/l.js',
		// Crisp chain-loads widget assets after the bootstrap client runs.
		allowUrlSubstrings: ['client.crisp.chat/'],
		bootstrapCheck: () =>
			check(
				Array.isArray(window.$crisp) &&
					window.CRISP_WEBSITE_ID === '00000000-0000-4000-8000-c15c15c15c15',
				'crisp queue and website id seeded before load'
			),
		runtimeCheck: () =>
			check(
				Array.isArray(window.$crisp),
				'window.$crisp queue remains available after loader executed'
			),
	},
	{
		vendor: 'intercom',
		// The widget bootstrap serves real JS for any app id but boots nothing
		// observable for placeholder ids, so runtime cannot be asserted without
		// a real workspace id (repo-secret follow-up).
		tier: 'loader-only',
		createScript: () => intercom({ appId: 'c15tfake' }),
		loaderUrlSubstring: 'widget.intercom.io/widget/c15tfake',
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
		runtimeCheck: () =>
			check(
				typeof window.Intercom === 'function',
				'window.Intercom callable after loader executed'
			),
	},
	{
		vendor: 'meta-pixel',
		tier: 'full',
		createScript: () => metaPixel({ pixelId: '123456789012345' }),
		loaderUrlSubstring: 'connect.facebook.net/en_US/fbevents.js',
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
		runtimeCheck: () =>
			check(
				typeof (window.fbq as MetaPixelRuntime | undefined)?.callMethod ===
					'function',
				'fbq.callMethod present after loader executed'
			),
	},
	{
		vendor: 'reddit-pixel',
		tier: 'full',
		createScript: () => redditPixel({ pixelId: 't2_c15tfake' }),
		loaderUrlSubstring: 'redditstatic.com/ads/pixel.js',
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
		runtimeCheck: () =>
			check(
				typeof window.rdt?.sendEvent === 'function',
				'rdt.sendEvent present after loader executed'
			),
	},
	{
		vendor: 'tiktok-pixel',
		tier: 'full',
		createScript: () => tiktokPixel({ pixelId: 'C15TFAKE' }),
		loaderUrlSubstring: 'analytics.tiktok.com/i18n/pixel/events.js',
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
	},
	{
		vendor: 'linkedin-insights',
		// insight.min.js serves real JS but initializes nothing observable for
		// placeholder partner ids; runtime needs a real partner id
		// (repo-secret follow-up).
		tier: 'loader-only',
		createScript: () => linkedinInsights({ id: '123456789' }),
		loaderUrlSubstring: 'snap.licdn.com/li.lms-analytics/insight.min.js',
		bootstrapCheck: () =>
			check(
				window._linkedin_partner_id === '123456789' &&
					window._linkedin_data_partner_ids?.includes('123456789') === true &&
					typeof window.lintrk === 'function',
				'linkedin partner globals and lintrk stub seeded before load'
			),
		runtimeCheck: () =>
			check(
				typeof window.lintrk === 'function',
				'window.lintrk callable after loader executed'
			),
	},
	{
		vendor: 'microsoft-uet',
		tier: 'full',
		createScript: () => microsoftUet({ id: '123456789' }),
		loaderUrlSubstring: 'bat.bing.com/bat.js',
		bootstrapCheck: () =>
			check(
				Array.isArray(window.uetq) && window.uetq.length > 0,
				'microsoft uet consent queue seeded before load'
			),
		runtimeCheck: () =>
			check(
				typeof (window as UetWindow).UET === 'function' &&
					typeof window.uetq?.push === 'function',
				'UET constructor and queue push present after loader executed'
			),
	},
	{
		vendor: 'snapchat-pixel',
		tier: 'full',
		createScript: () => snapchatPixel({ pixelId: '123456789012345' }),
		loaderUrlSubstring: 'sc-static.net/scevent.min.js',
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
		runtimeCheck: () =>
			check(
				typeof window.snaptr?.handleRequest === 'function',
				'snaptr.handleRequest present after loader executed'
			),
	},
	{
		vendor: 'x-pixel',
		tier: 'full',
		createScript: () => xPixel({ pixelId: 'o0000' }),
		loaderUrlSubstring: 'static.ads-twitter.com/uwt.js',
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
		runtimeCheck: () =>
			check(
				typeof (window.twq as XPixelRuntime | undefined)?.exe === 'function',
				'twq.exe present after loader executed'
			),
	},
];

/**
 * Looks up the live probe config for a vendor id.
 */
export function getLiveVendorProbeConfig(
	vendor: string
): LiveVendorProbeConfig | undefined {
	return liveVendorProbeConfigs.find((config) => config.vendor === vendor);
}
