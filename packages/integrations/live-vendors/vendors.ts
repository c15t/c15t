/**
 * Live probe definitions for built-in `@c15t/integrations` integrations.
 *
 * Each entry pairs a registry vendor with probe configuration and
 * the checks used by the live monitor. This module is imported by the Node
 * runner and bundled into the browser harness, so check callbacks run inside
 * the probed page.
 *
 * Placeholder ids must be obviously fake and must never point at a real
 * account.
 * The runner allows literal URL substring matches and answers other intercepted
 * HTTP requests with empty 204 responses. Allowlisted requests reach upstream;
 * these routing rules do not establish complete isolation or account delivery.
 */

import { adrollPixel } from '../src/vendors/ads-and-pixels/adroll';
import { amazonAdsTag } from '../src/vendors/ads-and-pixels/amazon-ads';
import { linkedinInsights } from '../src/vendors/ads-and-pixels/linkedin-insights';
import { liveIntentTag } from '../src/vendors/ads-and-pixels/liveintent';
import { metaPixel } from '../src/vendors/ads-and-pixels/meta-pixel';
import { microsoftUet } from '../src/vendors/ads-and-pixels/microsoft-uet';
import type { OpenAIPixelFunction } from '../src/vendors/ads-and-pixels/openai-pixel';
import { openaiPixel } from '../src/vendors/ads-and-pixels/openai-pixel';
import { pinterestTag } from '../src/vendors/ads-and-pixels/pinterest-tag';
import { redditPixel } from '../src/vendors/ads-and-pixels/reddit-pixel';
import { snapchatPixel } from '../src/vendors/ads-and-pixels/snapchat-pixel';
import { theTradeDeskPixel } from '../src/vendors/ads-and-pixels/the-trade-desk';
import { tiktokPixel } from '../src/vendors/ads-and-pixels/tiktok-pixel';
import { vector } from '../src/vendors/ads-and-pixels/vector';
import { xPixel } from '../src/vendors/ads-and-pixels/x-pixel';
import { adobeAnalytics } from '../src/vendors/analytics/adobe-analytics';
import { ahrefsAnalytics } from '../src/vendors/analytics/ahrefs-analytics';
import {
	AMPLITUDE_QUEUE_METHODS,
	amplitude,
} from '../src/vendors/analytics/amplitude';
import { clay } from '../src/vendors/analytics/clay';
import { clearbit } from '../src/vendors/analytics/clearbit';
import { cloudflareWebAnalytics } from '../src/vendors/analytics/cloudflare-web-analytics';
import { databuddy } from '../src/vendors/analytics/databuddy';
import { fathomAnalytics } from '../src/vendors/analytics/fathom-analytics';
import { fullStory } from '../src/vendors/analytics/fullstory';
import { gainsightPx } from '../src/vendors/analytics/gainsight-px';
import { gtag } from '../src/vendors/analytics/google-tag';
import { HEAP_QUEUE_METHODS, heap } from '../src/vendors/analytics/heap';
import {
	HIGHTOUCH_QUEUE_METHODS,
	hightouch,
} from '../src/vendors/analytics/hightouch';
import { hotjar } from '../src/vendors/analytics/hotjar';
import { logRocket } from '../src/vendors/analytics/logrocket';
import { luckyOrange } from '../src/vendors/analytics/lucky-orange';
import { marketoMunchkin } from '../src/vendors/analytics/marketo';
import { matomoAnalytics } from '../src/vendors/analytics/matomo-analytics';
import { clarity } from '../src/vendors/analytics/microsoft-clarity';
import { mixpanelAnalytics } from '../src/vendors/analytics/mixpanel-analytics';
import { oneDollarStats } from '../src/vendors/analytics/one-dollar-stats';
import { pendo } from '../src/vendors/analytics/pendo';
import { pirsch } from '../src/vendors/analytics/pirsch';
import { plausibleAnalytics } from '../src/vendors/analytics/plausible-analytics';
import { posthog } from '../src/vendors/analytics/posthog';
import { promptwatch } from '../src/vendors/analytics/promptwatch';
import { rb2b } from '../src/vendors/analytics/rb2b';
import {
	RUDDERSTACK_QUEUE_METHODS,
	rudderstack,
} from '../src/vendors/analytics/rudderstack';
import { rybbitAnalytics } from '../src/vendors/analytics/rybbit-analytics';
import { pardotTracking } from '../src/vendors/analytics/salesforce-pardot';
import { segment } from '../src/vendors/analytics/segment';
import { sentry } from '../src/vendors/analytics/sentry';
import type { SentryClient } from '../src/vendors/analytics/sentry';
import { statableAnalytics } from '../src/vendors/analytics/statable-analytics';
import { umamiAnalytics } from '../src/vendors/analytics/umami-analytics';
import { vercelAnalytics } from '../src/vendors/analytics/vercel-analytics';
import { vercelSpeedInsights } from '../src/vendors/analytics/vercel-speed-insights';
import { customerIo } from '../src/vendors/email-and-sms/customer-io';
import { insiderTag } from '../src/vendors/email-and-sms/insider';
import { klaviyo } from '../src/vendors/email-and-sms/klaviyo';
import { ada } from '../src/vendors/functional/ada';
import { adobeTarget } from '../src/vendors/functional/adobe-target';
import { appcues } from '../src/vendors/functional/appcues';
import { crisp } from '../src/vendors/functional/crisp';
import { dynamicYield } from '../src/vendors/functional/dynamic-yield';
import { frontChat } from '../src/vendors/functional/front-chat';
import { gorgiasChat } from '../src/vendors/functional/gorgias';
import { intercom } from '../src/vendors/functional/intercom';
import { optimizelyWeb } from '../src/vendors/functional/optimizely';
import { wisepops } from '../src/vendors/functional/wisepops';
import { zendeskWidget } from '../src/vendors/functional/zendesk';
import { googleTagManager } from '../src/vendors/tag-managers/google-tag-manager';
import type { LiveProbeCheckResult, LiveVendorProbeConfig } from './types';

interface OpenAIPixelRuntime extends OpenAIPixelFunction {
	loaded?: boolean;
	version?: string;
	measure?: (...args: unknown[]) => void;
	consent?: (granted: boolean) => void;
}

type LiveIntentProbeWindow = Window & {
	liQ?: {
		ready?: boolean;
		resolve?: unknown;
		resolveNonId?: unknown;
		version?: string;
	};
};

type AdrollProbeWindow = Window & {
	__adroll?: {
		loadGlobalFunctions?: unknown;
		track?: unknown;
		version?: string;
	};
};

type VectorProbeWindow = Window & {
	vector?: {
		loaded?: boolean;
		q?: unknown[];
		load?: unknown;
		identify?: unknown;
		on?: unknown;
		emit?: unknown;
		processQueue?: unknown;
		_queue?: unknown[];
		instances?: Map<string, { pixelId?: string }>;
	};
	Vector?: unknown;
	__vector_manager?: unknown;
};

const check = function check(
	ok: boolean,
	detail: string
): LiveProbeCheckResult {
	return { detail, ok };
};

type KlaviyoWindow = Window & {
	klaviyoModulesObject?: {
		companyId?: string;
	};
};

type PromptwatchWindow = Window & {
	pwc?: unknown;
};

type SpeedInsightsWindow = Window & {
	si?: unknown;
	siq?: unknown;
	sil?: boolean;
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

type CustomerIoProbeWindow = Window & {
	cioanalytics?: { _writeKey?: unknown; initialize?: unknown };
};

type PosthogProbeWindow = Window & {
	__c15tPosthogQueueReplayExpected?: boolean;
	__c15tPosthogQueueReplayed?: boolean;
};

/**
 * Probe configs for every built-in integration, ordered by registry vendor id.
 */
export const liveVendorProbeConfigs: LiveVendorProbeConfig[] = [
	{
		bootstrapCheck: () => {
			const px = (window as Window & { aptrinsic?: unknown }).aptrinsic as
				| (((...args: unknown[]) => void) & {
						p?: string;
						c?: { enableTag?: boolean };
						q?: unknown[];
				  })
				| undefined;
			return check(
				typeof px === 'function' &&
					px.p === 'AP-PRODUCT-KEY-2' &&
					px.c?.enableTag === true &&
					Array.isArray(px.q),
				'PX official product key, enabled config and arguments queue exist before load'
			);
		},
		createScript: () => gainsightPx({ productKey: 'AP-PRODUCT-KEY-2' }),
		loaderUrlSubstring: 'web-sdk.aptrinsic.com/api/aptrinsic.js',
		notes:
			'The loader serves JavaScript for a sample key; initialization depends on a valid account configuration response. Collection and configuration endpoints stay blocked, so this probe asserts endpoint reachability and bootstrap only.',
		tier: 'loader-only',
		vendor: 'gainsight-px',
	},
	{
		bootstrapCheck: () =>
			check(
				window._fs_capture_on_startup === false &&
					window.FS?._v === '2.1.0' &&
					window.FS.q?.[0]?.length === 6 &&
					window.FS.q[0][5] === 2,
				'FullStory v2 six-slot init queue with capture off'
			),
		createScript: () => fullStory({ orgId: 'c15t-live-probe-placeholder' }),
		loaderUrlSubstring: 'edge.fullstory.com/s/fs.js',
		notes:
			'A placeholder organization loads the public v2 SDK, but its settings request stays blocked, so the real dispatcher is not proven. This checks the capture-off init queue and loader reachability only. Collection stays blocked.',
		tier: 'loader-only',
		vendor: 'fullstory',
	},
	{
		allowUrlSubstrings: ['c.amazon-adsystem.com/aat/amzn-consent.js'],
		bootstrapCheck: () =>
			check(
				typeof window.amzn === 'function' &&
					Array.isArray(window.amzn.q) &&
					window.amzn.q.length === 0 &&
					window.amzn.version === '0.0',
				'Nested arguments queue waits for the ordered ACS helper'
			),
		createScript: () =>
			amazonAdsTag({
				countryCode: 'DE',
				tagId: '00000000-0000-0000-0000-000000000000',
			}),
		loaderUrlSubstring: 'c.amazon-adsystem.com/aat/amzn.js',
		notes:
			'Nil UUID accepted by the real parser, not an advertiser account. Both real loaders execute; all collection and geo/config requests are blocked. ACS denial is a consent signal, not a shutdown API.',
		runtimeCheck: () =>
			check(
				typeof window.amzn === 'function' &&
					window.amzn.q === undefined &&
					typeof window.amznConsent === 'function',
				'Real Amazon libraries replaced the queue and exposed ACS'
			),
		runtimeReplacedGlobals: ['amzn'],
		tier: 'full',
		vendor: 'amazon-ads',
	},
	{
		allowUrlSubstrings: ['https://messaging-assets.ada.support/'],
		createScript: () => ada({ handle: 'c15t-live-probe-placeholder' }),
		loaderUrlSubstring: 'messaging-assets.ada.support/sdk.js',
		notes:
			'Ada is callback-only and imports the real SDK entry after consent; there is no Script.src or loader element. The entry returns HTTP 200 and can fetch rollout modules and write rollout storage during evaluation. A placeholder handle with blocked Agent APIs cannot prove start, stop, a usable conversation or data erasure. This probe records module reachability only; collection stays blocked.',
		tier: 'loader-only',
		vendor: 'ada',
	},
	{
		bootstrapCheck: () =>
			check(
				window.GorgiasChat === undefined,
				'GorgiasChat is absent before the loader so its duplicate-install guard permits initialization'
			),
		createScript: () => gorgiasChat({ appKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXX' }),
		loaderUrlSubstring:
			'config.gorgias.chat/bundle-loader/XXXXXXXXXXXXXXXXXXXXXXXXXX',
		notes:
			'The placeholder v3 loader returns HTTP 200 with a 145-byte warning and creates no runtime. This checks the empty pre-load global and endpoint reachability only. A real pre-init proxy already exposes init, so that method cannot prove SDK readiness. Collection stays blocked.',
		tier: 'loader-only',
		vendor: 'gorgias',
	},
	{
		bootstrapCheck: () => {
			const api = window.zE;
			const range = api?._?.find(
				(args) => args[0] === 'messenger:set' && args[1] === 'cookies'
			);
			return check(
				typeof api === 'function' &&
					Array.isArray(api._) &&
					typeof api.t === 'number' &&
					window.zEmbed === api &&
					api.s instanceof HTMLScriptElement &&
					api.s.isConnected &&
					range?.[2] === 'all',
				'Zendesk arguments queue, alias, timestamp, real loader reference and all-consent cookie command exist before load'
			);
		},
		createScript: () =>
			zendeskWidget({ key: '00000000-0000-0000-0000-000000000000' }),
		loaderUrlSubstring:
			'static.zdassets.com/ekr/snippet.js?key=00000000-0000-0000-0000-000000000000',
		notes:
			'The universal snippet returns HTTP 200 for the all-zero placeholder key, while its compose endpoint returns HTTP 404. This checks bootstrap and loader reachability only, not a Messaging runtime or cookie cleanup. Configuration and collection stay blocked.',
		tier: 'loader-only',
		vendor: 'zendesk',
	},

	{
		bootstrapCheck: () =>
			check(
				typeof window.ttdConversionEvents === 'function' &&
					Array.isArray(window.ttdConversionEventsLayer) &&
					window.ttdConversionEventsLayer.length === 2,
				'Official init and event arguments queue'
			),
		createScript: () =>
			theTradeDeskPixel({
				advertiserId: 'rt7ftg2',
				enableCookieSyncing: false,
				pixelIds: ['ejs57s6'],
			}),
		loaderUrlSubstring: 'js.adsrvr.org/up_loader.3.0.0.js',
		notes:
			'Official sample advertiser and pixel IDs. Real SDK executes with collection and sync frames blocked. Account delivery and TDID creation are not verified by this monitor.',
		runtimeCheck: () =>
			check(
				typeof window.ttdConversionEvents?.dumpConfigs === 'function',
				'Real Trade Desk SDK added dumpConfigs'
			),
		tier: 'full',
		vendor: 'the-trade-desk',
	},
	{
		bootstrapCheck: () => ({
			// LiveConnect event guide uses an array, not a callable stub.
			// No synthetic conversion is configured for this live monitor.
			detail:
				'LiveConnect starts with an empty event array and no helper-created LI config',
			ok:
				Array.isArray(window.liQ) &&
				window.liQ.length === 0 &&
				window.LI === undefined,
		}),
		createScript: () => liveIntentTag({ tagId: 'a-00xx' }),
		loaderUrlSubstring: 'b-code.liadm.com/a-00xx.min.js',
		notes:
			'Public a-00xx example tag, explicitly authorized for this monitor. Its downloaded bundle is configured for advertiser 30117 and contains real SDK code, so this is not a sandbox. The existing runner blocks collection, identity resolution, sync frames and every non-loader third-party URL; add no broad liadm.com allowlist. Runtime check proves SDK object installation and config handling, not event delivery, complete consent handling or full shutdown. The downloaded TCF predicate disagrees with the four-purpose guide.',
		runtimeCheck: () => {
			// liveintent-placeholder.js replaces liQ with `new ri(...)`, handles
			// window.LI, and sets ready=true. ri has resolve/resolveNonId and a
			// version property. The helper creates only an array with .push.
			const runtime = (window as LiveIntentProbeWindow).liQ;
			return {
				detail: 'LiveConnect replaced liQ with its configured SDK event client',
				ok:
					runtime !== undefined &&
					!Array.isArray(runtime) &&
					typeof runtime.push === 'function' &&
					typeof runtime.resolve === 'function' &&
					typeof runtime.resolveNonId === 'function' &&
					typeof runtime.version === 'string' &&
					runtime.version.length > 0 &&
					runtime.ready === true &&
					window.LI?.appId === 'a-00xx',
			};
		},
		runtimeReplacedGlobals: ['liQ'],
		runtimeVersion: () => (window as LiveIntentProbeWindow).liQ?.version,
		// Downloaded a-00xx is real JavaScript with source-backed runtime markers.
		tier: 'full',
		vendor: 'liveintent',
	},
	{
		// oxlint-disable-next-line complexity -- Check the official globals, methods and Arguments queue together.
		bootstrapCheck: () => {
			// Vendor-published bootstrap, embedded by help article 360040116252:
			const queue = window.adroll;
			const entry = Array.isArray(queue) ? queue[0] : undefined;
			const args = Array.isArray(entry) ? entry[1] : undefined;
			const hasPageViewArguments =
				typeof args === 'object' &&
				args !== null &&
				Object.prototype.toString.call(args) === '[object Arguments]' &&
				'length' in args &&
				args.length === 1 &&
				'0' in args &&
				args[0] === 'pageView';
			return {
				detail:
					'Official AdRoll v2 globals and one [track, Arguments(pageView)] entry',
				ok:
					window.adroll_adv_id === '5L5IV3X4ZNCUZFMLN5KKOD' &&
					window.adroll_pix_id === 'DLEXXKZ55FGAPLBGIZ2AGG' &&
					window.adroll_version === '2.0' &&
					window.__adroll_loaded === true &&
					Array.isArray(queue) &&
					queue.length === 1 &&
					Array.isArray(queue.f) &&
					queue.f.length === 3 &&
					queue.f[0] === 'setProperties' &&
					queue.f[1] === 'identify' &&
					queue.f[2] === 'track' &&
					typeof queue.setProperties === 'function' &&
					typeof queue.identify === 'function' &&
					typeof queue.track === 'function' &&
					Array.isArray(entry) &&
					entry.length === 2 &&
					entry[0] === 'track' &&
					hasPageViewArguments,
			};
		},
		createScript: () =>
			adrollPixel({
				advertiserId: '5L5IV3X4ZNCUZFMLN5KKOD',
				pixelId: 'DLEXXKZ55FGAPLBGIZ2AGG',
			}),
		loaderUrlSubstring: 's.adroll.com/j/5L5IV3X4ZNCUZFMLN5KKOD/roundtrip.js',
		notes:
			'Public AdRoll house advertiser and pixel IDs, explicitly authorized for this monitor. The downloaded account-specific loader returned real v2 JavaScript. The existing runner blocks collection and every non-loader third-party URL; add no broad AdRoll allowlist. Runtime check proves SDK construction only, not queue replay, account delivery, cookie behavior or full shutdown.',
		runtimeCheck: () => {
			// adroll-v2-house.js creates window.__adroll with `new __adroll__`.
			// The constructor sets version and these prototype methods exist in
			// the downloaded bundle. Our bootstrap creates none of this object.
			const runtime = (window as AdrollProbeWindow).__adroll;
			return {
				detail:
					'Downloaded AdRoll SDK constructed __adroll and its runtime methods',
				ok:
					typeof runtime === 'object' &&
					runtime !== null &&
					typeof runtime.version === 'string' &&
					runtime.version.length > 0 &&
					typeof runtime.loadGlobalFunctions === 'function' &&
					typeof runtime.track === 'function',
			};
		},
		runtimeVersion: () => (window as AdrollProbeWindow).__adroll?.version,
		tier: 'full',
		vendor: 'adroll',
	},
	{
		// oxlint-disable-next-line complexity -- Verify the documented nested load tuple and all bootstrap methods together.
		bootstrapCheck: () => {
			const probeWindow: VectorProbeWindow = window;
			const stub = probeWindow.vector;
			const queue = stub?.q;
			const entry = Array.isArray(queue) ? queue[0] : undefined;
			const args = Array.isArray(entry) ? entry[1] : undefined;
			return {
				detail:
					'Vector bootstrap has loaded=true and one [load, [pixelId]] command before the real loader executes',
				ok:
					stub?.loaded === true &&
					typeof stub.load === 'function' &&
					typeof stub.identify === 'function' &&
					typeof stub.on === 'function' &&
					Array.isArray(queue) &&
					queue.length === 1 &&
					Array.isArray(entry) &&
					entry.length === 2 &&
					entry[0] === 'load' &&
					Array.isArray(args) &&
					args.length === 1 &&
					args[0] === 'c15t-test-pixel' &&
					probeWindow.__vector_manager === undefined,
			};
		},
		createScript: () => vector({ pixelId: 'c15t-test-pixel' }),
		loaderUrlSubstring: 'https://cdn.vector.co/pixel.js',
		notes:
			'Only the exact GET script URL https://cdn.vector.co/pixel.js is allowed by the batch config. The placeholder pixel proves bootstrap, manager replacement and nested queue replay only. API, settings, identity, collection, partner and other script requests stay blocked. Real account/domain settings and visitor identification are not validated. Settings require an authorized X-Request-URL; public account IDs cannot validate this test origin. Blocked empty settings responses may produce vendor JSON errors, which must remain visible. Vector has no documented complete stop API; revocation requires the normal c15t reload, and retained code may continue without it.',
		// oxlint-disable-next-line complexity -- Check source-backed manager aliases, live methods, queue drain and exact pixel replay together.
		runtimeCheck: () => {
			// pixel.js constructs __vector_manager, aliases Vector/vector to it,
			// drains _queue, deletes q, and creates an instance for the load ID.
			// These markers precede account-settings success and are absent from
			// our bootstrap. Do not use loaded=true as a runtime assertion.
			const probeWindow: VectorProbeWindow = window;
			const runtime = probeWindow.vector;
			const instances = runtime?.instances;
			const instance =
				instances instanceof Map ? instances.get('c15t-test-pixel') : undefined;
			return {
				detail:
					'Downloaded Vector manager replaced the stub, drained its nested queue and registered the exact placeholder pixel; account initialization is unverified',
				ok:
					runtime !== undefined &&
					runtime === probeWindow.__vector_manager &&
					runtime === probeWindow.Vector &&
					typeof runtime.load === 'function' &&
					typeof runtime.identify === 'function' &&
					typeof runtime.on === 'function' &&
					typeof runtime.emit === 'function' &&
					typeof runtime.processQueue === 'function' &&
					runtime.q === undefined &&
					Array.isArray(runtime._queue) &&
					runtime._queue.length === 0 &&
					instances instanceof Map &&
					instances.size === 1 &&
					instance?.pixelId === 'c15t-test-pixel',
			};
		},
		runtimeReplacedGlobals: ['vector'],
		tier: 'full',
		vendor: 'vector',
	},
	{
		bootstrapCheck: () =>
			check(
				window.statable === undefined,
				'Statable event API left absent before the real tracker loads'
			),
		createScript: () => statableAnalytics({ siteId: 123456789 }),
		loaderUrlSubstring: 'statable.com/js/123456789/s.js',
		notes:
			'The public loader serves JavaScript for a placeholder site ID. Collection requests are blocked; this does not verify dashboard attribution.',
		runtimeCheck: () =>
			check(
				typeof window.statable?.t === 'function' &&
					document.cookie === '' &&
					localStorage.length === 0 &&
					sessionStorage.length === 0,
				'Statable initialized its event API without cookies or browser storage'
			),
		tier: 'full',
		vendor: 'statable-analytics',
	},
	{
		bootstrapCheck: () =>
			check(
				window.pendo === undefined,
				'No Pendo namespace until the real agent loads'
			),
		// Real public key from https://web-sdk.pendo.io/ page source lets the
		// probe load the actual agent. The runner blocks collection and account
		// configuration requests.
		createScript: () =>
			pendo({ apiKey: '2a7e6935-2488-4303-61ea-eda91d575707' }),
		loaderUrlSubstring:
			'cdn.pendo.io/agent/static/2a7e6935-2488-4303-61ea-eda91d575707/pendo.js',
		notes:
			'Public vendor API key proves real agent installation and initialize/stop/start API availability. Collection and account configuration requests are blocked. No authorized account event delivery, replay, or guide behavior is verified.',
		runtimeCheck: () =>
			check(
				typeof window.pendo?.initialize === 'function' &&
					typeof window.pendo.stopSendingEvents === 'function' &&
					typeof window.pendo.startSendingEvents === 'function',
				'Real Pendo initialize and event controls'
			),
		runtimeReplacedGlobals: ['pendo'],
		tier: 'full',
		vendor: 'pendo',
	},
	{
		allowUrlSubstrings: [
			'tools.luckyorange.com/core/',
			'settings.luckyorange.com/a4e370c0',
		],
		bootstrapCheck: () =>
			check(Array.isArray(window.LOQ), 'Lucky Orange ready callback queue'),
		createScript: () => luckyOrange({ siteId: 'a4e370c0' }),
		loaderUrlSubstring: 'tools.luckyorange.com/core/lo.js',
		notes:
			'Public vendor site ID proves real loader and privacy API installation with a regular Chrome user agent; settings reject the headless default. The sample account has Require Consent disabled, so its account-specific Require Consent behavior is not verified. Require Consent must be enabled in the account. Collection is blocked; complete stop of active recordings and behavior with DNT or existing vendor opt-out are not verified. Keep reload on withdrawal.',
		runtimeCheck: () =>
			check(
				typeof window.LO?.privacy?.setConsentStatus === 'function',
				'Lucky Orange installed its privacy API'
			),
		runtimeReplacedGlobals: ['LO'],
		tier: 'full',
		userAgent:
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
		vendor: 'lucky-orange',
	},
	{
		createScript: () => rb2b({ accountKey: 'C15TFAKERB2BKEY' }),
		loaderUrlSubstring:
			'ddwl4m2hdecbv.cloudfront.net/b/C15TFAKERB2BKEY/C15TFAKERB2BKEY.js.gz',
		notes:
			'Placeholder account key provides consent gating and endpoint reachability coverage only. Runtime initialization and visitor identification are not verified; collection is blocked.',
		tier: 'loader-only',
		vendor: 'rb2b',
	},
	{
		createScript: () => optimizelyWeb({ projectId: '12345678' }),
		loaderUrlSubstring: 'cdn.optimizely.com/js/12345678.js',
		notes:
			'The official sample project returns HTTP 403. This checks CDN reachability only; a dedicated project is needed for account runtime validation.',
		tier: 'loader-only',
		vendor: 'optimizely',
	},

	{
		bootstrapCheck: () =>
			check(
				window.DY?.userActiveConsent?.accepted === true,
				'Active Cookie Consent is granted only after the mapped gate'
			),
		createScript: () => dynamicYield({ sectionId: '1234567' }),
		loaderUrlSubstring: 'cdn.dynamicyield.com/api/1234567/api_dynamic.js',
		notes:
			'Placeholder sections return HTTP403. This checks endpoint reachability and the consent bootstrap, not a configured section or SDK runtime.',
		tier: 'loader-only',
		vendor: 'dynamic-yield',
	},

	{
		bootstrapCheck: () => {
			const adobeWindow = window as Window & {
				alloy?: { (...args: unknown[]): Promise<unknown>; q?: unknown[] };
				__alloyNS?: string[];
			};
			const { alloy } = adobeWindow;
			return check(
				typeof alloy === 'function' &&
					Array.isArray(alloy.q) &&
					adobeWindow.__alloyNS?.includes('alloy') === true,
				'Adobe promise-queue stub and alloy namespace exist after consent, before SDK execution'
			);
		},
		createScript: () =>
			adobeTarget({
				datastreamId: '00000000-0000-4000-8000-000000000000',
				mode: 'websdk',
				orgId: 'C15TFAKE@AdobeOrg',
				version: '2.30.0',
			}),
		loaderUrlSubstring: 'cdn1.adoberesources.net/alloy/2.30.0/alloy.min.js',
		notes:
			'Web SDK 2.30.0 has a public CDN loader. Placeholder organization and datastream IDs and blocked collection cannot validate configuration, setConsent delivery or Target offers. This monitor asserts bootstrap and loader reachability only; customer-hosted at.js is not covered.',
		tier: 'loader-only',
		vendor: 'adobe-target',
	},

	{
		bootstrapCheck: () =>
			check(
				window.AppcuesSettings?.enableURLDetection === true,
				'Appcues settings exist before its loader executes'
			),
		createScript: () => appcues({ accountId: 'c15t-nonexistent-account' }),
		loaderUrlSubstring: 'fast.appcues.com/c15t-nonexistent-account.js',
		notes:
			'Placeholder accounts may reject the loader. This probe proves consent gating and endpoint reachability, not SDK initialization; use a real account for onboarding flows.',
		tier: 'loader-only',
		vendor: 'appcues',
	},

	{
		allowUrlSubstrings: ['wisepops.net/h/c15tfake/loader.js?v=3'],
		bootstrapCheck: () => {
			const api = window.wisepops;
			const options = api?.q?.find((args) => args[0] === 'options');
			return check(
				typeof api === 'function' &&
					typeof api.l === 'number' &&
					Array.isArray(api.q) &&
					options?.[1]?.defaultConsent === 'denied',
				'Wisepops arguments queue, snippet timestamp and denied default exist before loader execution'
			);
		},
		createScript: () => wisepops({ siteId: 'c15tfake' }),
		loaderUrlSubstring: 'wisepops.net/loader.js?v=3&h=c15tfake',
		notes:
			'The placeholder loader redirects with HTTP 301, then returns HTTP 404. This checks the denied-default bootstrap and endpoint response only; the runner can record the redirect. It cannot validate runtime startup or a campaign. Stored grants can override the denied default, and no supported consent-denied API exists. Collection stays blocked.',
		tier: 'loader-only',
		vendor: 'wisepops',
	},

	{
		allowUrlSubstrings: ['munchkin.marketo.net/'],
		createScript: () => marketoMunchkin({ munchkinId: 'AAA-BBB-CCC' }),
		loaderUrlSubstring: 'munchkin.marketo.net/munchkin.js',
		notes:
			'Uses a placeholder Munchkin ID. Collection is blocked. This validates SDK installation, not attribution to a configured Marketo account.',
		runtimeCheck: () =>
			check(
				typeof window.MunchkinTracker?.init === 'function',
				'Munchkin runtime methods installed by the real loader'
			),
		tier: 'full',
		vendor: 'marketo',
	},
	{
		bootstrapCheck: () =>
			check(
				typeof window.pdt === 'function' && Array.isArray(window.pdt.cq),
				'Pardot callable cq queue'
			),
		createScript: () =>
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}),
		loaderUrlSubstring: 'pi.pardot.com/pdt.js',
		notes:
			'Placeholder account and campaign prove real consent dispatcher installation, not account activation or analytics delivery. Every collection and clearing request is blocked.',
		runtimeCheck: () =>
			check(
				typeof window.pdt === 'function' && !window.pdt.cq,
				'Pardot replaced its snippet queue'
			),
		runtimeReplacedGlobals: ['pdt'],
		tier: 'full',
		vendor: 'salesforce-pardot',
	},
	{
		skipReason:
			'Attentive placeholder slugs do not install the tag, and no authorized test tenant is configured.',
		tier: 'skip',
		vendor: 'attentive',
	},
	{
		allowUrlSubstrings: [
			'cdp.customer.io/v1/projects/47e549aabef763c4f2fc/settings',
			'cdp.customer.io/v1/analytics-js/',
		],
		bootstrapCheck: () =>
			check(
				Array.isArray(window.cioanalytics) &&
					(window as CustomerIoProbeWindow).cioanalytics?._writeKey ===
						'47e549aabef763c4f2fc' &&
					document.querySelector(
						'script[data-global-customerio-analytics-key="cioanalytics"]'
					) !== null,
				'Customer.io namespace, array queue and write key'
			),
		createScript: () => customerIo({ writeKey: '47e549aabef763c4f2fc' }),
		loaderUrlSubstring:
			'cdp.customer.io/v1/analytics-js/snippet/47e549aabef763c4f2fc/analytics.min.js',
		notes:
			'Public US write key yields actual JavaScript. Invalid keys or wrong regions can return 200 JSON and do not prove SDK execution. Collection and destination endpoints are blocked; account delivery and complete destination shutdown are not verified.',
		runtimeCheck: () =>
			check(
				typeof (window as CustomerIoProbeWindow).cioanalytics?.initialize ===
					'function',
				'Customer.io installed its real analytics SDK'
			),
		runtimeReplacedGlobals: ['cioanalytics'],
		tier: 'full',
		vendor: 'customer-io',
	},
	{
		bootstrapCheck: () => {
			const queue = window.InsiderQueue;
			return check(
				Array.isArray(queue) &&
					queue.length === 3 &&
					queue[0]?.type === 'user' &&
					queue[0]?.value?.gdpr_optin === true &&
					queue[1]?.type === 'other' &&
					queue[2]?.type === 'init',
				'Insider queue contains the granted user, default page and init in order before load'
			);
		},
		createScript: () =>
			insiderTag({ partnerId: '123456', partnerName: 'c15t' }),
		loaderUrlSubstring: 'c15t.api.useinsider.com/ins.js?id=123456',
		notes:
			'The placeholder partner returns HTTP 200 with a 52-byte HTML response, not an SDK. This checks the user/page/init bootstrap and endpoint reachability only. A dedicated Web SDK-enabled account is required for runtime and consent-update validation; collection stays blocked.',
		tier: 'loader-only',
		vendor: 'insider',
	},

	{
		skipReason:
			'Requires a configured Cloudflare zone and purpose IDs. This bridge does not fetch a public vendor loader.',
		tier: 'skip',
		vendor: 'cloudflare-zaraz',
	},
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
		allowUrlSubstrings: ['cdn.claydar.com/releases/latest/radar.min.js'],
		createScript: () => clay({ siteId: 'c15tfake' }),
		loaderUrlSubstring: 'static.claydar.com/init.v1.js?id=c15tfake',
		notes:
			'Placeholder profile verifies real loader and tracker execution; API collection requests are blocked and account configuration is unverified.',
		runtimeCheck: () =>
			check(
				typeof window.Claydar?.denyCookieConsent === 'function',
				'Clay tracker exposes its consent method'
			),
		runtimeReplacedGlobals: ['Claydar'],
		tier: 'full',
		vendor: 'clay',
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
				| (Window['clarity'] & { v?: unknown; t?: unknown })
				| undefined;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.clarity stub function');
			}

			// The stub must carry NEITHER runtime marker: the tag guards with
			// `if (clarity.v || clarity.t) return` and refuses to start when
			// either is pre-set ("Error CL001: Multiple Clarity tags detected")
			// — the production bug fixed in #898.
			if (stub.v || stub.t) {
				return check(
					false,
					`stub carries v=${String(stub.v)}/t=${String(stub.t)}; the tag's \`if (clarity.v || clarity.t) return\` guard treats this as a duplicate install (CL001) and never starts`
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
		runtimeVersion: () => {
			const runtime = window.clarity as
				| (Window['clarity'] & { v?: unknown })
				| undefined;

			return typeof runtime?.v === 'string' ? runtime.v : undefined;
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
				},

				token: 'c15fc15fc15fc15fc15fc15fc15fc15f',
			}),
		deniedConsentProbe: {
			// Denied consent replays opt_out_tracking through the queue, and the
			// helper's opt-out defaults keep the SDK from storing events or a
			// visitor ID before that call lands. The SDK still writes an empty
			// mp_* cookie at startup and removes it during init, which this
			// end-of-load snapshot cannot see. The live SDK must produce zero
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
		// No runtimeCheck: cdn.matomo.cloud answers a placeholder cloud id with a
		// 404 HTML page, so no Matomo runtime can ever exist here. Declaring an
		// unreachable check would misreport this vendor as runtime-covered.
		notes:
			'Placeholder Matomo Cloud ids return HTTP 404 from cdn.matomo.cloud, so no runtime is asserted. Upgrading to full tier needs a real cloud id supplied as a secret.',
		// Matomo is self-hosted or account-hosted; the default public-cloud path
		// for a fake cloud id returns 404, so this only proves the derived loader.
		tier: 'loader-only',
		vendor: 'matomo-analytics',
	},
	{
		// array.js chain-loads versioned SDK bundles from the same assets host.
		allowUrlSubstrings: ['assets.i.posthog.com/static/'],
		bootstrapCheck: () => {
			const stub = window.posthog as unknown;

			if (Array.isArray(stub)) {
				const queuedStub = stub as unknown[] & { _i?: unknown[][] };
				if (!Array.isArray(queuedStub._i) || queuedStub._i.length === 0) {
					return check(false, 'expected posthog pending init queue');
				}

				const probeWindow = window as PosthogProbeWindow;
				probeWindow.__c15tPosthogQueueReplayExpected = true;
				queuedStub.push(() => {
					probeWindow.__c15tPosthogQueueReplayed = true;
				});

				return check(
					true,
					'posthog snippet queue carries init and a live replay probe'
				);
			}

			if (
				typeof stub !== 'object' ||
				stub === null ||
				!('init' in stub) ||
				typeof stub.init !== 'function'
			) {
				return check(false, 'expected window.posthog stub with init()');
			}

			return check(
				'get_explicit_consent_status' in stub &&
					typeof stub.get_explicit_consent_status === 'function' &&
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
			const probeWindow = window as PosthogProbeWindow;
			const sdk = window.posthog as
				| (Window['posthog'] & { __loaded?: boolean })
				| undefined;

			if (sdk?.__loaded !== true) {
				return check(false, 'posthog SDK has not reported __loaded after init');
			}

			if (
				probeWindow.__c15tPosthogQueueReplayExpected &&
				probeWindow.__c15tPosthogQueueReplayed !== true
			) {
				return check(false, 'posthog SDK did not replay the snippet queue');
			}

			return check(
				true,
				probeWindow.__c15tPosthogQueueReplayExpected
					? 'posthog SDK initialized and replayed the snippet queue'
					: 'posthog SDK reports __loaded after init'
			);
		},
		runtimeVersion: () => {
			const sdk = window.posthog as
				| (Window['posthog'] & { version?: unknown })
				| undefined;

			return typeof sdk?.version === 'string' ? sdk.version : undefined;
		},

		tier: 'full',
		vendor: 'posthog',
	},
	{
		createScript: () =>
			oneDollarStats({ devmode: 'true', hostname: 'c15t-live-probe.invalid' }),
		loaderUrlSubstring: 'assets.onedollarstats.com/stonks.js',
		runtimeCheck: () => {
			const { stonks } = window as Window & {
				stonks?: { event?: unknown; view?: unknown };
			};
			return check(
				typeof stonks?.view === 'function' &&
					typeof stonks?.event === 'function',
				'window.stonks view and event present after loader executed'
			);
		},
		tier: 'full',
		vendor: 'one-dollar-stats',
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
			sentry({
				dsn: 'https://00000000000000000000000000000000@o0.ingest.sentry.io/0',
				initOptions: {
					autoSessionTracking: false,
					replaysOnErrorSampleRate: 1,
					replaysSessionSampleRate: 1,
				},
			}),
		deniedConsentProbe: {
			collectUrlSubstrings: ['browser.sentry-cdn.com/11.4.0/replay.min.js'],
			notes:
				'Error monitoring remains active; Replay must not load before consent.',
			storagePrefixes: ['sentryReplaySession'],
		},
		loaderUrlSubstring: 'browser.sentry-cdn.com/11.4.0/bundle.min.js',
		notes:
			'Uses a placeholder DSN. The runner blocks all ingest requests; Replay behavior is covered by the integration lifecycle tests.',
		runtimeCheck: () => {
			const sdk = (
				window as Window & {
					Sentry?: { getClient?: () => SentryClient | undefined };
				}
			).Sentry;
			return check(
				Boolean(sdk?.getClient?.()?.getDsn()),
				'expected an initialized Sentry browser client'
			);
		},
		runtimeVersion: () =>
			(window as Window & { Sentry?: { SDK_VERSION?: string } }).Sentry
				?.SDK_VERSION,
		tier: 'full',
		vendor: 'sentry',
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
		// No runtimeCheck: probed live, script.js needs a Vercel deployment
		// context and leaves `window.va` as our bare stub (no added properties,
		// no new globals). `typeof window.va === 'function'` only re-asserts the
		// bootstrap stub.
		notes:
			'Vercel Analytics installs no runtime outside a Vercel deployment, so no runtime is asserted. Upgrading to full tier needs the probe served from a Vercel deployment.',
		// script.js serves real JS but leaves the va stub untouched outside a
		// real Vercel deployment context; runtime is not observable with
		// placeholder config.
		tier: 'loader-only',
		vendor: 'vercel-analytics',
	},
	{
		bootstrapCheck: () =>
			check(
				typeof (window as SpeedInsightsWindow).si === 'function' &&
					Array.isArray((window as SpeedInsightsWindow).siq),
				'si stub and siq queue present before load'
			),
		// The production script.js returns early when navigator.webdriver is
		// set. The debug bundle skips that check and sends no requests.
		createScript: () => vercelSpeedInsights({ debug: true }),
		loaderUrlSubstring:
			'va.vercel-scripts.com/v1/speed-insights/script.debug.js',
		// script.debug.js sets window.sil once it starts and swaps the si stub
		// for its own beforeSend setter.
		runtimeCheck: () =>
			check(
				(window as SpeedInsightsWindow).sil === true,
				'window.sil set after collector started'
			),
		runtimeReplacedGlobals: ['si'],
		tier: 'full',
		vendor: 'vercel-speed-insights',
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
		// No runtimeCheck: probed live, l.js adds no global and leaves the queue
		// untouched for a placeholder website id. Asserting `$crisp` is still an
		// array would only re-assert our own bootstrap stub.
		notes:
			'Crisp adds no observable global for placeholder website ids, so no runtime is asserted. Upgrading to full tier needs a real website id supplied as a secret.',
		// l.js loads for any website id but the client keeps the $crisp queue
		// untouched for placeholder ids; runtime needs a real website id
		// (repo-secret follow-up).
		tier: 'loader-only',
		vendor: 'crisp',
	},
	{
		bootstrapCheck: () =>
			check(
				typeof window.FrontChat === 'undefined',
				'FrontChat is not seeded before the vendor loader executes'
			),
		createScript: () => frontChat({ chatId: 'c15tfake' }),
		loaderUrlSubstring: 'chat-assets.frontapp.com/v1/chat.bundle.js',
		notes:
			'The public Front Chat loader redirects to a versioned bundle; runtime installation is still required. The chat iframe and every other third-party request are blocked. This does not validate a live chat session with a real channel.',
		// The helper seeds no FrontChat stub, so this function can only be
		// installed by the real loader. The embedded chat page stays blocked.
		runtimeCheck: () =>
			check(
				typeof window.FrontChat === 'function',
				'window.FrontChat present after the vendor loader executed'
			),
		// The stable loader URL returns a 302 to a versioned bundle. The
		// monitor records that first response, so accept the redirect while
		// still requiring the runtime installed by the final bundle below.
		tier: 'loader-only',
		vendor: 'front-chat',
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
		// No runtimeCheck: probed live, the widget bundle adds no global for a
		// placeholder app id. `typeof window.Intercom === 'function'` is
		// satisfied by the bootstrap queue stub alone.
		notes:
			'Intercom adds no observable global for placeholder app ids, so no runtime is asserted. Upgrading to full tier needs a real workspace id supplied as a secret.',
		// The widget bootstrap serves real JS for any app id but boots nothing
		// observable for placeholder ids, so runtime cannot be asserted without
		// a real workspace id (repo-secret follow-up).
		tier: 'loader-only',
		vendor: 'intercom',
	},
	{
		// Klaviyo.js is a small account-keyed loader that appends the onsite
		// modules (forms, tracking, identity) from both static hosts.
		allowUrlSubstrings: [
			'static.klaviyo.com/onsite/js/',
			'static-tracking.klaviyo.com/onsite/js/',
		],
		// Matches the guard in Klaviyo's object snippet: an existing
		// `window.klaviyo` is kept, so the queue must exist before load.
		bootstrapCheck: () =>
			check(
				typeof window.klaviyo?.identify === 'function' &&
					Array.isArray(window._klOnsite) &&
					window._klOnsite.length === 0,
				'klaviyo object and empty _klOnsite queue seeded before load'
			),
		createScript: () => klaviyo({ publicApiKey: 'c15tfk' }),
		loaderUrlSubstring: 'static.klaviyo.com/onsite/js/c15tfk/klaviyo.js',
		notes:
			'The loader serves its module manifest for any well-formed key, so the probe asserts the real runtime against a placeholder account. Form configuration and every a.klaviyo.com request are blocked; this does not validate a real account.',
		runtimeCheck: () =>
			check(
				(window as KlaviyoWindow).klaviyoModulesObject?.companyId === 'c15tfk',
				'klaviyoModulesObject registered for the placeholder account after Klaviyo.js executed'
			),
		runtimeReplacedGlobals: ['klaviyo'],
		tier: 'full',
		vendor: 'klaviyo',
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
		runtimeVersion: () => (window.fbq as MetaPixelRuntime | undefined)?.version,
		tier: 'full',
		vendor: 'meta-pixel',
	},
	{
		bootstrapCheck: () => {
			const stub = window.oaiq;
			return check(
				typeof stub === 'function' && Array.isArray(stub.q),
				'oaiq command queue exists before load'
			);
		},
		createScript: () => openaiPixel({ pixelId: 'c15t_live_probe_placeholder' }),
		loaderUrlSubstring: 'bzrcdn.openai.com/sdk/oaiq.min.js',
		runtimeCheck: () => {
			// The CDN loader sets loaded and replaces the stub with command methods.
			const runtime = window.oaiq as OpenAIPixelRuntime | undefined;
			return check(
				runtime?.loaded === true &&
					typeof runtime.measure === 'function' &&
					typeof runtime.consent === 'function',
				'OpenAI SDK loaded with measure and consent methods'
			);
		},
		runtimeReplacedGlobals: ['oaiq'],
		runtimeVersion: () =>
			(window.oaiq as OpenAIPixelRuntime | undefined)?.version,
		tier: 'full',
		vendor: 'openai-pixel',
	},
	{
		// core.js loads the versioned runtime from this path. Collection uses
		// ct.pinterest.com and must remain blocked by the probe.
		allowUrlSubstrings: ['https://s.pinimg.com/ct/lib/'],
		bootstrapCheck: () => {
			const stub = window.pintrk;

			if (typeof stub !== 'function') {
				return check(false, 'expected window.pintrk stub function');
			}

			return check(
				stub.version === '3.0' &&
					Array.isArray(stub.queue) &&
					stub.queue.length > 0,
				'pinterest tag stub version and queue seeded before load'
			);
		},
		createScript: () => pinterestTag({ tagId: '123456789012345' }),
		loaderUrlSubstring: 's.pinimg.com/ct/core.js',
		runtimeCheck: () => {
			// Pinterest's runtime never replaces `window.pintrk`; it drains the
			// stub's queue and swaps `queue.push` for its command dispatcher, and
			// `load` records the tag id on the stub. Neither exists pre-load.
			const stub = window.pintrk as
				| (Window['pintrk'] & { tagId?: unknown })
				| undefined;
			const queue = stub?.queue;

			return check(
				Array.isArray(queue) &&
					queue.push !== Array.prototype.push &&
					typeof stub?.tagId === 'string',
				'pintrk.queue.push replaced and tagId recorded after loader executed'
			);
		},
		tier: 'full',
		vendor: 'pinterest-tag',
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
		// No runtimeCheck: probed live, insight.min.js fires one beacon and adds
		// no global for a placeholder partner id. `typeof window.lintrk ===
		// 'function'` is satisfied by the bootstrap queue stub alone.
		notes:
			'LinkedIn adds no observable global for placeholder partner ids, so no runtime is asserted. Upgrading to full tier needs a real partner id supplied as a secret.',
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
