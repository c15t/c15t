/**
 * One script per built-in integration, built from its public helper with
 * sample options, and the fields the helper must set.
 */

import type { BuiltInScriptIntegrationKey } from '../registry';
import { adrollPixel } from '../vendors/ads-and-pixels/adroll';
import { linkedinInsights } from '../vendors/ads-and-pixels/linkedin-insights';
import { liveIntentTag } from '../vendors/ads-and-pixels/liveintent';
import { metaPixel } from '../vendors/ads-and-pixels/meta-pixel';
import { microsoftUet } from '../vendors/ads-and-pixels/microsoft-uet';
import { openaiPixel } from '../vendors/ads-and-pixels/openai-pixel';
import { pinterestTag } from '../vendors/ads-and-pixels/pinterest-tag';
import { redditPixel } from '../vendors/ads-and-pixels/reddit-pixel';
import { snapchatPixel } from '../vendors/ads-and-pixels/snapchat-pixel';
import { theTradeDeskPixel } from '../vendors/ads-and-pixels/the-trade-desk';
import { tiktokPixel } from '../vendors/ads-and-pixels/tiktok-pixel';
import { vector } from '../vendors/ads-and-pixels/vector';
import { xPixel } from '../vendors/ads-and-pixels/x-pixel';
import { adobeAnalytics } from '../vendors/analytics/adobe-analytics';
import { ahrefsAnalytics } from '../vendors/analytics/ahrefs-analytics';
import { amplitude } from '../vendors/analytics/amplitude';
import { clay } from '../vendors/analytics/clay';
import { clearbit } from '../vendors/analytics/clearbit';
import { cloudflareWebAnalytics } from '../vendors/analytics/cloudflare-web-analytics';
import { databuddy } from '../vendors/analytics/databuddy';
import { defaultComPixel } from '../vendors/analytics/default-com';
import { fathomAnalytics } from '../vendors/analytics/fathom-analytics';
import { gtag } from '../vendors/analytics/google-tag';
import { heap } from '../vendors/analytics/heap';
import { hightouch } from '../vendors/analytics/hightouch';
import { hotjar } from '../vendors/analytics/hotjar';
import { logRocket } from '../vendors/analytics/logrocket';
import { luckyOrange } from '../vendors/analytics/lucky-orange';
import { marketoMunchkin } from '../vendors/analytics/marketo';
import { matomoAnalytics } from '../vendors/analytics/matomo-analytics';
import { clarity } from '../vendors/analytics/microsoft-clarity';
import { mixpanelAnalytics } from '../vendors/analytics/mixpanel-analytics';
import { oneDollarStats } from '../vendors/analytics/one-dollar-stats';
import { pendo } from '../vendors/analytics/pendo';
import { pirsch } from '../vendors/analytics/pirsch';
import { plausibleAnalytics } from '../vendors/analytics/plausible-analytics';
import { posthog } from '../vendors/analytics/posthog';
import { promptwatch } from '../vendors/analytics/promptwatch';
import { rb2b } from '../vendors/analytics/rb2b';
import { rudderstack } from '../vendors/analytics/rudderstack';
import { rybbitAnalytics } from '../vendors/analytics/rybbit-analytics';
import { pardotTracking } from '../vendors/analytics/salesforce-pardot';
import { segment } from '../vendors/analytics/segment';
import { sentry } from '../vendors/analytics/sentry';
import { statableAnalytics } from '../vendors/analytics/statable-analytics';
import { umamiAnalytics } from '../vendors/analytics/umami-analytics';
import { vercelAnalytics } from '../vendors/analytics/vercel-analytics';
import { vercelSpeedInsights } from '../vendors/analytics/vercel-speed-insights';
import { attentiveTag } from '../vendors/email-and-sms/attentive';
import { customerIo } from '../vendors/email-and-sms/customer-io';
import { insiderTag } from '../vendors/email-and-sms/insider';
import { klaviyo } from '../vendors/email-and-sms/klaviyo';
import { ada } from '../vendors/functional/ada';
import { adobeTarget } from '../vendors/functional/adobe-target';
import { appcues } from '../vendors/functional/appcues';
import { crisp } from '../vendors/functional/crisp';
import { dynamicYield } from '../vendors/functional/dynamic-yield';
import { frontChat } from '../vendors/functional/front-chat';
import { gorgiasChat } from '../vendors/functional/gorgias';
import { intercom } from '../vendors/functional/intercom';
import { optimizelyWeb } from '../vendors/functional/optimizely';
import { wisepops } from '../vendors/functional/wisepops';
import { zendeskWidget } from '../vendors/functional/zendesk';
import { cloudflareZaraz } from '../vendors/tag-managers/cloudflare-zaraz';
import { googleTagManager } from '../vendors/tag-managers/google-tag-manager';
import type { expectScriptMatchesIntegration } from './helpers';

export const helperParityCases = {
	ada: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: undefined,
		},
		script: ada({ handle: 'c15t-live-probe-placeholder' }),
	},
	adobeAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		},
		script: adobeAnalytics({
			scriptUrl:
				'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		}),
	},
	adobeTarget: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: '/scripts/at.js',
		},
		script: adobeTarget({ mode: 'atjs', scriptUrl: '/scripts/at.js' }),
	},
	adrollPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://s.adroll.com/j/c15tfake/roundtrip.js',
		},
		script: adrollPixel({ advertiserId: 'c15tfake', pixelId: 'c15tfake' }),
	},
	ahrefsAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://analytics.ahrefs.com/analytics.js',
		},
		script: ahrefsAnalytics({ key: 'ahrefs-key' }),
	},
	amplitude: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://cdn.amplitude.com/libs/analytics-browser-2.44.4-min.js.gz',
		},
		script: amplitude({ apiKey: 'AMPLITUDE-CONTRACT' }),
	},
	appcues: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://fast.appcues.com/123.js',
		},
		script: appcues({ accountId: '123' }),
	},
	attentiveTag: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://cdn.attn.tv/c15tfake/dtag.js',
		},
		script: attentiveTag({ siteSlug: 'c15tfake' }),
	},
	clay: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://static.claydar.com/init.v1.js?id=c15tfake',
		},
		script: clay({ siteId: 'c15tfake' }),
	},
	clearbit: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://tag.clearbitscripts.com/v1/pk_contract/tags.js',
		},
		script: clearbit({ publishableKey: 'pk_contract' }),
	},
	cloudflareWebAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.cloudflareinsights.com/beacon.min.js',
		},
		script: cloudflareWebAnalytics({ token: 'tok-abc' }),
	},
	cloudflareZaraz: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: undefined,
		},
		script: cloudflareZaraz({ purposes: { measurement: ['analytics'] } }),
	},
	crisp: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://client.crisp.chat/l.js',
		},
		script: crisp({ websiteId: 'crisp-123' }),
	},
	customerIo: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://cdp.customer.io/v1/analytics-js/snippet/test-key/analytics.min.js',
		},
		script: customerIo({ writeKey: 'test-key' }),
	},
	databuddy: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.databuddy.cc/databuddy.js',
		},
		script: databuddy({
			clientId: 'db_123',
			configWhenDenied: { clientId: 'db_123', disabled: true },

			configWhenGranted: { clientId: 'db_123', disabled: false },
		}),
	},
	defaultComPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://handshake.default.com/index.js',
		},
		script: defaultComPixel({ publicKey: 'c15tfake' }),
	},
	dynamicYield: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.dynamicyield.com/api/1234567/api_dynamic.js',
		},
		script: dynamicYield({ sectionId: '1234567' }),
	},
	fathomAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.usefathom.com/script.js',
		},
		script: fathomAnalytics({ site: 'SITE123' }),
	},
	frontChat: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://chat-assets.frontapp.com/v1/chat.bundle.js',
		},
		script: frontChat({ chatId: 'front-chat-123' }),
	},
	googleTagManager: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://www.googletagmanager.com/gtm.js?id=GTM-123',
		},
		script: googleTagManager({ id: 'GTM-123' }),
	},
	gorgiasChat: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://config.gorgias.chat/bundle-loader/XXXXXXXXXXXXXXXXXXXXXXXXXX',
		},
		script: gorgiasChat({ appKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXX' }),
	},
	gtag: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: true,
			src: 'https://www.googletagmanager.com/gtag/js?id=G-123',
		},
		script: gtag({ category: 'measurement', id: 'G-123' }),
	},
	heap: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.us.heap-api.com/config/123456789/heap_config.js',
		},
		script: heap({ envId: '123456789' }),
	},
	hightouch: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.hightouch-events.com/browser/release/v1-latest/events.min.js',
		},
		script: hightouch({ writeKey: 'abc123xyz456' }),
	},
	hotjar: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.hotjar.com/c/hotjar-1234567.js?sv=6',
		},
		script: hotjar({ siteId: 1234567 }),
	},
	insiderTag: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://c15t.api.useinsider.com/ins.js?id=123456',
		},
		script: insiderTag({ partnerId: '123456', partnerName: 'c15t' }),
	},
	intercom: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://widget.intercom.io/widget/abc123',
		},
		script: intercom({ appId: 'abc123' }),
	},
	klaviyo: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.klaviyo.com/onsite/js/AbC123/klaviyo.js',
		},
		script: klaviyo({ publicApiKey: 'AbC123' }),
	},
	linkedinInsights: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		},
		script: linkedinInsights({ id: '987654' }),
	},
	liveIntentTag: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://b-code.liadm.com/a-00xx.min.js',
		},
		script: liveIntentTag({ tagId: 'a-00xx' }),
	},
	logRocket: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.logrocket.io/LogRocket.min.js',
		},
		script: logRocket({ appId: 'c15tfake/c15tfake' }),
	},
	luckyOrange: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://tools.luckyorange.com/core/lo.js?site-id=YOUR_SITE_ID',
		},
		script: luckyOrange({ siteId: 'YOUR_SITE_ID' }),
	},
	marketoMunchkin: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://munchkin.marketo.net/munchkin.js',
		},
		script: marketoMunchkin({ munchkinId: 'AAA-BBB-CCC' }),
	},
	matomoAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://analytics.example.com/matomo.js',
		},
		script: matomoAnalytics({
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
		}),
	},
	metaPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://connect.facebook.net/en_US/fbevents.js',
		},
		script: metaPixel({ pixelId: '123456' }),
	},
	'microsoft-clarity': {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://www.clarity.ms/tag/abcdef1234',
		},
		script: clarity({ id: 'abcdef1234' }),
	},
	microsoftUet: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: true,
			src: '//bat.bing.com/bat.js',
		},
		script: microsoftUet({ id: 'uet-123' }),
	},
	mixpanelAnalytics: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		},
		script: mixpanelAnalytics({
			token: '1234567890abcdef1234567890abcdef',
		}),
	},
	oneDollarStats: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://assets.onedollarstats.com/stonks.js',
		},
		script: oneDollarStats(),
	},
	openaiPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://bzrcdn.openai.com/sdk/oaiq.min.js',
		},
		script: openaiPixel({ pixelId: 'OPENAI-CONTRACT' }),
	},
	optimizelyWeb: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.optimizely.com/js/12345678.js',
		},
		script: optimizelyWeb({ projectId: '12345678' }),
	},
	pardotTracking: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://pi.pardot.com/pdt.js?aid=123456',
		},
		script: pardotTracking({
			piAId: '123456',
			piCId: '654321',
			piDomain: 'pi.pardot.com',
		}),
	},
	pendo: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://cdn.pendo.io/agent/static/YOUR_API_KEY/pendo.js',
		},
		script: pendo({ apiKey: 'YOUR_API_KEY' }),
	},
	pinterestTag: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://s.pinimg.com/ct/core.js',
		},
		script: pinterestTag({ tagId: '2613654212508' }),
	},
	pirsch: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://api.pirsch.io/pa.js',
		},
		script: pirsch({ identificationCode: 'PIRSCH-CONTRACT' }),
	},
	plausibleAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://plausible.io/js/script.js',
		},
		script: plausibleAnalytics({ domain: 'example.com' }),
	},
	posthog: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://eu-assets.i.posthog.com/static/array.js',
		},
		script: posthog({ id: 'phc_123' }),
	},
	promptwatch: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://ingest.promptwatch.com/js/client.min.js',
		},
		script: promptwatch({
			projectId: '7d60345b-27bb-4779-a385-d4fc19ce732c',
		}),
	},
	rb2b: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://ddwl4m2hdecbv.cloudfront.net/b/c15tfake/c15tfake.js.gz',
		},
		script: rb2b({ accountKey: 'c15tfake' }),
	},
	redditPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://www.redditstatic.com/ads/pixel.js',
		},
		script: redditPixel({ pixelId: 't2_abcdef' }),
	},
	rudderstack: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.rudderlabs.com/v3/modern/rsa.min.js',
		},
		script: rudderstack({
			dataPlaneUrl: 'https://c15t-live-probe.invalid',

			writeKey: 'abc123xyz456',
		}),
	},
	rybbitAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://app.rybbit.io/api/script.js',
		},
		script: rybbitAnalytics({ siteId: 'rybbit-123' }),
	},
	segment: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.segment.com/analytics.js/v1/abc123xyz456/analytics.min.js',
		},
		script: segment({ writeKey: 'abc123xyz456' }),
	},
	sentry: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://browser.sentry-cdn.com/11.4.0/bundle.min.js',
		},
		script: sentry({ dsn: 'https://key@o0.ingest.sentry.io/0' }),
	},
	snapchatPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://sc-static.net/scevent.min.js',
		},
		script: snapchatPixel({ pixelId: '123456789012345' }),
	},
	statableAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://statable.com/js/12345/s.js',
		},
		script: statableAnalytics({ siteId: 12345 }),
	},
	theTradeDeskPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://js.adsrvr.org/up_loader.3.0.0.js',
		},
		script: theTradeDeskPixel({
			advertiserId: 'c15tfake',
			pixelIds: ['c15tfake'],
		}),
	},
	tiktokPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=tt-123&lib=ttq',
		},
		script: tiktokPixel({ pixelId: 'tt-123' }),
	},
	umamiAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cloud.umami.is/script.js',
		},
		script: umamiAnalytics({ websiteId: 'site-abc' }),
	},
	vector: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://cdn.vector.co/pixel.js',
		},
		script: vector({ pixelId: '00000000-0000-0000-0000-000000000000' }),
	},
	vercelAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://va.vercel-scripts.com/v1/script.js',
		},
		script: vercelAnalytics(),
	},
	vercelSpeedInsights: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://va.vercel-scripts.com/v1/speed-insights/script.js',
		},
		script: vercelSpeedInsights(),
	},
	wisepops: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://wisepops.net/loader.js?v=3&h=c15tfake',
		},
		script: wisepops({ siteId: 'c15tfake' }),
	},
	xPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.ads-twitter.com/uwt.js',
		},
		script: xPixel({ pixelId: 'tw-123' }),
	},
	zendeskWidget: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.zdassets.com/ekr/snippet.js?key=00000000-0000-0000-0000-000000000000',
		},
		script: zendeskWidget({ key: '00000000-0000-0000-0000-000000000000' }),
	},
} satisfies Record<
	BuiltInScriptIntegrationKey,
	Parameters<typeof expectScriptMatchesIntegration>[2] extends infer Expected
		? {
				script: Parameters<typeof expectScriptMatchesIntegration>[1];
				expected: Expected;
			}
		: never
>;
