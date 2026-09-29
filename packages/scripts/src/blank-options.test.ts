import type { Script } from '@c15t/core';
import { describe, expect, it } from 'vitest';

import { linkedinInsights } from './vendors/ads-and-pixels/linkedin-insights';
import { metaPixel } from './vendors/ads-and-pixels/meta-pixel';
import { microsoftUet } from './vendors/ads-and-pixels/microsoft-uet';
import { openaiPixel } from './vendors/ads-and-pixels/openai-pixel';
import { pinterestTag } from './vendors/ads-and-pixels/pinterest-tag';
import { redditPixel } from './vendors/ads-and-pixels/reddit-pixel';
import { snapchatPixel } from './vendors/ads-and-pixels/snapchat-pixel';
import { tiktokPixel } from './vendors/ads-and-pixels/tiktok-pixel';
import { xPixel } from './vendors/ads-and-pixels/x-pixel';
import { cloudflareWebAnalytics } from './vendors/analytics/cloudflare-web-analytics';
import { databuddy } from './vendors/analytics/databuddy';
import { fathomAnalytics } from './vendors/analytics/fathom-analytics';
import { gtag } from './vendors/analytics/google-tag';
import { hotjar } from './vendors/analytics/hotjar';
import { matomoAnalytics } from './vendors/analytics/matomo-analytics';
import { clarity } from './vendors/analytics/microsoft-clarity';
import { mixpanelAnalytics } from './vendors/analytics/mixpanel-analytics';
import { plausibleAnalytics } from './vendors/analytics/plausible-analytics';
import { posthog } from './vendors/analytics/posthog';
import { segment } from './vendors/analytics/segment';
import { vercelAnalytics } from './vendors/analytics/vercel-analytics';
import { crisp } from './vendors/functional/crisp';
import { intercom } from './vendors/functional/intercom';
import { googleTagManager } from './vendors/tag-managers/google-tag-manager';

const BLANK_VALUES = ['', '   '] as const;

const requiredIdCases: {
	helper: string;
	option: string;
	create: (id: string) => Script;
}[] = [
	{
		create: (id) => linkedinInsights({ id }),
		helper: 'linkedinInsights',
		option: 'id',
	},
	{
		create: (pixelId) => metaPixel({ pixelId }),
		helper: 'metaPixel',
		option: 'pixelId',
	},
	{
		create: (id) => microsoftUet({ id }),
		helper: 'microsoftUet',
		option: 'id',
	},
	{
		create: (pixelId) => openaiPixel({ pixelId }),
		helper: 'openaiPixel',
		option: 'pixelId',
	},
	{
		create: (tagId) => pinterestTag({ tagId }),
		helper: 'pinterestTag',
		option: 'tagId',
	},
	{
		create: (pixelId) => redditPixel({ pixelId }),
		helper: 'redditPixel',
		option: 'pixelId',
	},
	{
		create: (pixelId) => snapchatPixel({ pixelId }),
		helper: 'snapchatPixel',
		option: 'pixelId',
	},
	{
		create: (pixelId) => tiktokPixel({ pixelId }),
		helper: 'tiktokPixel',
		option: 'pixelId',
	},
	{
		create: (pixelId) => xPixel({ pixelId }),
		helper: 'xPixel',
		option: 'pixelId',
	},
	{
		create: (websiteId) => crisp({ websiteId }),
		helper: 'crisp',
		option: 'websiteId',
	},
	{
		create: (appId) => intercom({ appId }),
		helper: 'intercom',
		option: 'appId',
	},
	{
		create: (id) => googleTagManager({ id }),
		helper: 'googleTagManager',
		option: 'id',
	},
	{
		create: (id) => gtag({ category: 'measurement', id }),
		helper: 'gtag',
		option: 'id',
	},
	{
		create: (clientId) => databuddy({ clientId }),
		helper: 'databuddy',
		option: 'clientId',
	},
	{
		create: (site) => fathomAnalytics({ site }),
		helper: 'fathomAnalytics',
		option: 'site',
	},
	{
		create: (id) => posthog({ id }),
		helper: 'posthog',
		option: 'id',
	},
];

describe('required IDs', () => {
	for (const { helper, option, create } of requiredIdCases) {
		for (const blank of BLANK_VALUES) {
			it(`${helper} throws for ${JSON.stringify(blank)} as ${option}`, () => {
				expect(() => create(blank)).toThrowError(
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
