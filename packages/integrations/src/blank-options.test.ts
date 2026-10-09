import type { Script } from '@c15t/core';
import { describe, expect, it } from 'vitest';

import { expectSkippedScript } from './__tests__/helpers';
import { linkedinInsights } from './vendors/ads-and-pixels/linkedin-insights';
import { metaPixel } from './vendors/ads-and-pixels/meta-pixel';
import { microsoftUet } from './vendors/ads-and-pixels/microsoft-uet';
import { openaiPixel } from './vendors/ads-and-pixels/openai-pixel';
import { pinterestTag } from './vendors/ads-and-pixels/pinterest-tag';
import { redditPixel } from './vendors/ads-and-pixels/reddit-pixel';
import { snapchatPixel } from './vendors/ads-and-pixels/snapchat-pixel';
import { tiktokPixel } from './vendors/ads-and-pixels/tiktok-pixel';
import { xPixel } from './vendors/ads-and-pixels/x-pixel';
import { adobeAnalytics } from './vendors/analytics/adobe-analytics';
import { ahrefsAnalytics } from './vendors/analytics/ahrefs-analytics';
import { amplitude } from './vendors/analytics/amplitude';
import { clearbit } from './vendors/analytics/clearbit';
import { cloudflareWebAnalytics } from './vendors/analytics/cloudflare-web-analytics';
import { databuddy } from './vendors/analytics/databuddy';
import { fathomAnalytics } from './vendors/analytics/fathom-analytics';
import { gtag } from './vendors/analytics/google-tag';
import { heap } from './vendors/analytics/heap';
import { hightouch } from './vendors/analytics/hightouch';
import { hotjar } from './vendors/analytics/hotjar';
import { logRocket } from './vendors/analytics/logrocket';
import { matomoAnalytics } from './vendors/analytics/matomo-analytics';
import { clarity } from './vendors/analytics/microsoft-clarity';
import { mixpanelAnalytics } from './vendors/analytics/mixpanel-analytics';
import { pirsch } from './vendors/analytics/pirsch';
import { plausibleAnalytics } from './vendors/analytics/plausible-analytics';
import { posthog } from './vendors/analytics/posthog';
import { promptwatch } from './vendors/analytics/promptwatch';
import { rudderstack } from './vendors/analytics/rudderstack';
import { rybbitAnalytics } from './vendors/analytics/rybbit-analytics';
import { segment } from './vendors/analytics/segment';
import { sentry } from './vendors/analytics/sentry';
import { umamiAnalytics } from './vendors/analytics/umami-analytics';
import { vercelAnalytics } from './vendors/analytics/vercel-analytics';
import { klaviyo } from './vendors/email-and-sms/klaviyo';
import { crisp } from './vendors/functional/crisp';
import { frontChat } from './vendors/functional/front-chat';
import { intercom } from './vendors/functional/intercom';
import { googleTagManager } from './vendors/tag-managers/google-tag-manager';

const BLANK_VALUES = ['', '   '] as const;

// Values that reach a helper when an environment variable is unset or the
// caller passes the wrong type through a cast.
const MISSING_ID_VALUES: unknown[] = ['', '   ', undefined, null, {}];

// Lets each case pass a value the option's type does not allow.
const asId = (value: unknown): string => value as string;

const requiredIdCases: {
	helper: string;
	option: string;
	create: (id: unknown) => Script;
	script: Pick<Script, 'category' | 'id'>;
}[] = [
	{
		create: (id) => linkedinInsights({ id: asId(id) }),
		helper: 'linkedinInsights',
		option: 'id',
		script: { category: 'marketing', id: 'linkedin-insights' },
	},
	{
		create: (pixelId) => metaPixel({ pixelId: asId(pixelId) }),
		helper: 'metaPixel',
		option: 'pixelId',
		script: { category: 'marketing', id: 'meta-pixel' },
	},
	{
		create: (id) => microsoftUet({ id: asId(id) }),
		helper: 'microsoftUet',
		option: 'id',
		script: { category: 'marketing', id: 'microsoft-uet' },
	},
	{
		create: (pixelId) => openaiPixel({ pixelId: asId(pixelId) }),
		helper: 'openaiPixel',
		option: 'pixelId',
		script: { category: 'marketing', id: 'openai-pixel' },
	},
	{
		create: (tagId) => pinterestTag({ tagId: asId(tagId) }),
		helper: 'pinterestTag',
		option: 'tagId',
		script: { category: 'marketing', id: 'pinterest-tag' },
	},
	{
		create: (pixelId) => redditPixel({ pixelId: asId(pixelId) }),
		helper: 'redditPixel',
		option: 'pixelId',
		script: { category: 'marketing', id: 'reddit-pixel' },
	},
	{
		create: (pixelId) => snapchatPixel({ pixelId: asId(pixelId) }),
		helper: 'snapchatPixel',
		option: 'pixelId',
		script: { category: 'marketing', id: 'snapchat-pixel' },
	},
	{
		create: (pixelId) => tiktokPixel({ pixelId: asId(pixelId) }),
		helper: 'tiktokPixel',
		option: 'pixelId',
		script: { category: 'marketing', id: 'tiktok-pixel' },
	},
	{
		create: (pixelId) => xPixel({ pixelId: asId(pixelId) }),
		helper: 'xPixel',
		option: 'pixelId',
		script: { category: 'marketing', id: 'x-pixel' },
	},
	{
		create: (scriptUrl) => adobeAnalytics({ scriptUrl: asId(scriptUrl) }),
		helper: 'adobeAnalytics',
		option: 'scriptUrl',
		script: { category: 'measurement', id: 'adobe-analytics' },
	},
	{
		create: (key) => ahrefsAnalytics({ key: asId(key) }),
		helper: 'ahrefsAnalytics',
		option: 'key',
		script: { category: 'measurement', id: 'ahrefs-analytics' },
	},
	{
		create: (apiKey) => amplitude({ apiKey: asId(apiKey) }),
		helper: 'amplitude',
		option: 'apiKey',
		script: { category: 'measurement', id: 'amplitude' },
	},
	{
		create: (publishableKey) =>
			clearbit({ publishableKey: asId(publishableKey) }),
		helper: 'clearbit',
		option: 'publishableKey',
		script: { category: 'marketing', id: 'clearbit' },
	},
	{
		create: (token) => cloudflareWebAnalytics({ token: asId(token) }),
		helper: 'cloudflareWebAnalytics',
		option: 'token',
		script: { category: 'measurement', id: 'cloudflare-web-analytics' },
	},
	{
		create: (clientId) => databuddy({ clientId: asId(clientId) }),
		helper: 'databuddy',
		option: 'clientId',
		script: { category: 'measurement', id: 'databuddy' },
	},
	{
		create: (site) => fathomAnalytics({ site: asId(site) }),
		helper: 'fathomAnalytics',
		option: 'site',
		script: { category: 'measurement', id: 'fathom-analytics' },
	},
	{
		create: (id) => gtag({ category: 'marketing', id: asId(id) }),
		helper: 'gtag',
		option: 'id',
		script: { category: 'marketing', id: 'gtag' },
	},
	{
		create: (envId) => heap({ envId: asId(envId) }),
		helper: 'heap',
		option: 'envId',
		script: { category: 'measurement', id: 'heap' },
	},
	{
		create: (writeKey) => hightouch({ writeKey: asId(writeKey) }),
		helper: 'hightouch',
		option: 'writeKey',
		script: { category: 'measurement', id: 'hightouch' },
	},
	{
		create: (siteId) => hotjar({ siteId: asId(siteId) }),
		helper: 'hotjar',
		option: 'siteId',
		script: { category: 'measurement', id: 'hotjar' },
	},
	{
		create: (appId) => logRocket({ appId: asId(appId) }),
		helper: 'logRocket',
		option: 'appId',
		script: { category: 'measurement', id: 'logrocket' },
	},
	{
		create: (id) => clarity({ id: asId(id) }),
		helper: 'clarity',
		option: 'id',
		script: { category: 'measurement', id: 'microsoft-clarity' },
	},
	{
		create: (token) => mixpanelAnalytics({ token: asId(token) }),
		helper: 'mixpanelAnalytics',
		option: 'token',
		script: { category: 'measurement', id: 'mixpanel-analytics' },
	},
	{
		create: (identificationCode) =>
			pirsch({ identificationCode: asId(identificationCode) }),
		helper: 'pirsch',
		option: 'identificationCode',
		script: { category: 'measurement', id: 'pirsch' },
	},
	{
		create: (id) => posthog({ id: asId(id) }),
		helper: 'posthog',
		option: 'id',
		script: { category: 'measurement', id: 'posthog' },
	},
	{
		create: (projectId) => promptwatch({ projectId: asId(projectId) }),
		helper: 'promptwatch',
		option: 'projectId',
		script: { category: 'measurement', id: 'promptwatch' },
	},
	{
		create: (writeKey) =>
			rudderstack({
				dataPlaneUrl: 'https://dataplane.example.com',
				writeKey: asId(writeKey),
			}),
		helper: 'rudderstack',
		option: 'writeKey',
		script: { category: 'measurement', id: 'rudderstack' },
	},
	{
		create: (dataPlaneUrl) =>
			rudderstack({ dataPlaneUrl: asId(dataPlaneUrl), writeKey: 'key' }),
		helper: 'rudderstack',
		option: 'dataPlaneUrl',
		script: { category: 'measurement', id: 'rudderstack' },
	},
	{
		create: (siteId) => rybbitAnalytics({ siteId: asId(siteId) }),
		helper: 'rybbitAnalytics',
		option: 'siteId',
		script: { category: 'measurement', id: 'rybbit-analytics' },
	},
	{
		create: (writeKey) => segment({ writeKey: asId(writeKey) }),
		helper: 'segment',
		option: 'writeKey',
		script: { category: 'measurement', id: 'segment' },
	},
	{
		create: (dsn) => sentry({ dsn: asId(dsn) }),
		helper: 'sentry',
		option: 'dsn',
		script: {
			category: { or: ['necessary', 'measurement'] },
			id: 'sentry',
		},
	},
	{
		create: (websiteId) => umamiAnalytics({ websiteId: asId(websiteId) }),
		helper: 'umamiAnalytics',
		option: 'websiteId',
		script: { category: 'measurement', id: 'umami-analytics' },
	},
	{
		create: (publicApiKey) => klaviyo({ publicApiKey: asId(publicApiKey) }),
		helper: 'klaviyo',
		option: 'publicApiKey',
		script: {
			category: { and: ['marketing', 'measurement'] },
			id: 'klaviyo',
		},
	},
	{
		create: (websiteId) => crisp({ websiteId: asId(websiteId) }),
		helper: 'crisp',
		option: 'websiteId',
		script: { category: 'functionality', id: 'crisp' },
	},
	{
		create: (chatId) => frontChat({ chatId: asId(chatId) }),
		helper: 'frontChat',
		option: 'chatId',
		script: { category: 'functionality', id: 'front-chat' },
	},
	{
		create: (appId) => intercom({ appId: asId(appId) }),
		helper: 'intercom',
		option: 'appId',
		script: { category: 'functionality', id: 'intercom' },
	},
	{
		create: (id) => googleTagManager({ id: asId(id) }),
		helper: 'googleTagManager',
		option: 'id',
		script: { category: 'necessary', id: 'google-tag-manager' },
	},
];

describe('required IDs', () => {
	for (const { helper, option, create, script } of requiredIdCases) {
		for (const missing of MISSING_ID_VALUES) {
			const label =
				missing === undefined ? 'undefined' : JSON.stringify(missing);

			it(`${helper} logs and skips loading for ${label} as ${option}`, () => {
				expectSkippedScript(
					() => create(missing),
					script,
					`${helper}: missing or invalid ${option}`
				);
			});
		}
	}
});

const blankScriptUrlCases: {
	helper: string;
	create: (scriptUrl: string) => Script;
	expectedSrc: string;
}[] = [
	{
		create: (scriptUrl) => hotjar({ scriptUrl, siteId: 123 }),
		expectedSrc: 'https://static.hotjar.com/c/hotjar-123.js?sv=6',
		helper: 'hotjar',
	},
	{
		create: (scriptUrl) => fathomAnalytics({ scriptUrl, site: 'ABCDEF' }),
		expectedSrc: 'https://cdn.usefathom.com/script.js',
		helper: 'fathomAnalytics',
	},
	{
		create: (scriptUrl) =>
			cloudflareWebAnalytics({ scriptUrl, token: 'cf-token' }),
		expectedSrc: 'https://static.cloudflareinsights.com/beacon.min.js',
		helper: 'cloudflareWebAnalytics',
	},
	{
		create: (scriptUrl) => segment({ scriptUrl, writeKey: 'write-key' }),
		expectedSrc:
			'https://cdn.segment.com/analytics.js/v1/write-key/analytics.min.js',
		helper: 'segment',
	},
	{
		create: (scriptSrc) => linkedinInsights({ id: '123', scriptSrc }),
		expectedSrc: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		helper: 'linkedinInsights',
	},
	{
		create: (scriptSrc) => xPixel({ pixelId: 'x-123', scriptSrc }),
		expectedSrc: 'https://static.ads-twitter.com/uwt.js',
		helper: 'xPixel',
	},
	{
		create: (scriptSrc) => tiktokPixel({ pixelId: 'tt-123', scriptSrc }),
		expectedSrc:
			'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=tt-123&lib=ttq',
		helper: 'tiktokPixel',
	},
	{
		create: (scriptSrc) => microsoftUet({ id: 'uet-123', scriptSrc }),
		expectedSrc: '//bat.bing.com/bat.js',
		helper: 'microsoftUet',
	},
	{
		create: (scriptSrc) => crisp({ scriptSrc, websiteId: 'crisp-123' }),
		expectedSrc: 'https://client.crisp.chat/l.js',
		helper: 'crisp',
	},
	{
		create: (scriptSrc) => intercom({ appId: 'app-123', scriptSrc }),
		expectedSrc: 'https://widget.intercom.io/widget/app-123',
		helper: 'intercom',
	},
	{
		create: (scriptUrl) =>
			mixpanelAnalytics({
				scriptUrl,
				token: '0123456789abcdef0123456789abcdef',
			}),
		expectedSrc: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		helper: 'mixpanelAnalytics',
	},
	{
		create: (scriptUrl) => databuddy({ clientId: 'client-123', scriptUrl }),
		expectedSrc: 'https://cdn.databuddy.cc/databuddy.js',
		helper: 'databuddy',
	},
	{
		create: (scriptUrl) => clarity({ id: 'clarity-123', scriptUrl }),
		expectedSrc: 'https://www.clarity.ms/tag/clarity-123',
		helper: 'clarity',
	},
	{
		create: (scriptUrl) => posthog({ id: 'phc_123', scriptUrl }),
		expectedSrc: 'https://eu-assets.i.posthog.com/static/array.js',
		helper: 'posthog',
	},
	{
		create: (scriptUrl) => vercelAnalytics({ scriptUrl }),
		expectedSrc: 'https://va.vercel-scripts.com/v1/script.js',
		helper: 'vercelAnalytics',
	},
	{
		create: (scriptUrl) =>
			matomoAnalytics({
				matomoUrl: 'https://analytics.example.com',
				scriptUrl,
			}),
		expectedSrc: 'https://analytics.example.com/matomo.js',
		helper: 'matomoAnalytics',
	},
	{
		create: (scriptUrl) =>
			plausibleAnalytics({ domain: 'example.com', scriptUrl }),
		expectedSrc: 'https://plausible.io/js/script.js',
		helper: 'plausibleAnalytics',
	},
];

describe('blank loader URL overrides', () => {
	for (const { helper, create, expectedSrc } of blankScriptUrlCases) {
		for (const blank of BLANK_VALUES) {
			it(`${helper} uses the default loader for ${JSON.stringify(blank)}`, () => {
				expect(create(blank).src).toBe(expectedSrc);
			});
		}
	}
});
