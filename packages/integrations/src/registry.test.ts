import type { AllConsentNames } from '@c15t/core';
import { describe, expect, it } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };
import { expectScriptMatchesIntegration } from './__tests__/helpers';
import { helperParityCases } from './__tests__/integration-cases';
import {
	BUILT_IN_INTEGRATION_CATEGORIES,
	builtInScriptIntegrations,
	getBuiltInScriptIntegration,
	getBuiltInScriptIntegrationBySubpath,
	getBuiltInScriptIntegrationByVendor,
} from './registry';
import type { IntegrationConsentCondition } from './registry';
import { adrollPixelManifest } from './vendors/ads-and-pixels/adroll';
import { amazonAdsTagManifest } from './vendors/ads-and-pixels/amazon-ads';
import { linkedinInsightsManifest } from './vendors/ads-and-pixels/linkedin-insights';
import { liveIntentTagManifest } from './vendors/ads-and-pixels/liveintent';
import { metaPixelManifest } from './vendors/ads-and-pixels/meta-pixel';
import { microsoftUetManifest } from './vendors/ads-and-pixels/microsoft-uet';
import { openaiPixelManifest } from './vendors/ads-and-pixels/openai-pixel';
import { pinterestTagManifest } from './vendors/ads-and-pixels/pinterest-tag';
import { redditPixelManifest } from './vendors/ads-and-pixels/reddit-pixel';
import { snapchatPixelManifest } from './vendors/ads-and-pixels/snapchat-pixel';
import { theTradeDeskPixelManifest } from './vendors/ads-and-pixels/the-trade-desk';
import { tiktokPixelManifest } from './vendors/ads-and-pixels/tiktok-pixel';
import { vectorManifest } from './vendors/ads-and-pixels/vector';
import { xPixelManifest } from './vendors/ads-and-pixels/x-pixel';
import { adobeAnalyticsManifest } from './vendors/analytics/adobe-analytics';
import { ahrefsAnalyticsManifest } from './vendors/analytics/ahrefs-analytics';
import { amplitudeManifest } from './vendors/analytics/amplitude';
import { clayManifest } from './vendors/analytics/clay';
import { clearbitManifest } from './vendors/analytics/clearbit';
import { cloudflareWebAnalyticsManifest } from './vendors/analytics/cloudflare-web-analytics';
import { databuddyManifest } from './vendors/analytics/databuddy';
import { defaultComPixelManifest } from './vendors/analytics/default-com';
import { fathomAnalyticsManifest } from './vendors/analytics/fathom-analytics';
import { fullStoryManifest } from './vendors/analytics/fullstory';
import { gainsightPxManifest } from './vendors/analytics/gainsight-px';
import { gtagManifest } from './vendors/analytics/google-tag';
import { heapManifest } from './vendors/analytics/heap';
import { hightouchManifest } from './vendors/analytics/hightouch';
import { hotjarManifest } from './vendors/analytics/hotjar';
import { hubspotManifest } from './vendors/analytics/hubspot';
import { logRocketManifest } from './vendors/analytics/logrocket';
import { luckyOrangeManifest } from './vendors/analytics/lucky-orange';
import { marketoManifest } from './vendors/analytics/marketo';
import { matomoAnalyticsManifest } from './vendors/analytics/matomo-analytics';
import { clarityManifest } from './vendors/analytics/microsoft-clarity';
import { mixpanelAnalyticsManifest } from './vendors/analytics/mixpanel-analytics';
import { oneDollarStatsManifest } from './vendors/analytics/one-dollar-stats';
import { eloquaTrackingManifest } from './vendors/analytics/oracle-eloqua';
import { pendoManifest } from './vendors/analytics/pendo';
import { pirschManifest } from './vendors/analytics/pirsch';
import { plausibleAnalyticsManifest } from './vendors/analytics/plausible-analytics';
import { posthogManifest } from './vendors/analytics/posthog';
import { promptwatchManifest } from './vendors/analytics/promptwatch';
import { rb2bManifest } from './vendors/analytics/rb2b';
import { rudderstackManifest } from './vendors/analytics/rudderstack';
import { rybbitAnalyticsManifest } from './vendors/analytics/rybbit-analytics';
import { pardotTrackingManifest } from './vendors/analytics/salesforce-pardot';
import { segmentManifest } from './vendors/analytics/segment';
import { sentryManifest } from './vendors/analytics/sentry';
import { statableAnalyticsManifest } from './vendors/analytics/statable-analytics';
import { umamiAnalyticsManifest } from './vendors/analytics/umami-analytics';
import { vercelAnalyticsManifest } from './vendors/analytics/vercel-analytics';
import { vercelSpeedInsightsManifest } from './vendors/analytics/vercel-speed-insights';
import { activeCampaignTrackingManifest } from './vendors/email-and-sms/activecampaign';
import { attentiveTagManifest } from './vendors/email-and-sms/attentive';
import { customerIoManifest } from './vendors/email-and-sms/customer-io';
import { insiderManifest } from './vendors/email-and-sms/insider';
import { klaviyoManifest } from './vendors/email-and-sms/klaviyo';
import { adaManifest } from './vendors/functional/ada';
import { adobeTargetManifest } from './vendors/functional/adobe-target';
import { appcuesManifest } from './vendors/functional/appcues';
import { crispManifest } from './vendors/functional/crisp';
import { dynamicYieldManifest } from './vendors/functional/dynamic-yield';
import { frontChatManifest } from './vendors/functional/front-chat';
import { gorgiasChatManifest } from './vendors/functional/gorgias';
import { intercomManifest } from './vendors/functional/intercom';
import { optimizelyWebManifest } from './vendors/functional/optimizely';
import { wisepopsManifest } from './vendors/functional/wisepops';
import { zendeskWidgetManifest } from './vendors/functional/zendesk';
import { googleTagManagerManifest } from './vendors/tag-managers/google-tag-manager';

const validConsentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const satisfies readonly AllConsentNames[];

const vendorManifests = [
	clayManifest,
	hubspotManifest,
	defaultComPixelManifest,
	eloquaTrackingManifest,
	activeCampaignTrackingManifest,
	gainsightPxManifest,
	fullStoryManifest,
	amazonAdsTagManifest,
	adaManifest,
	gorgiasChatManifest,
	zendeskWidgetManifest,
	theTradeDeskPixelManifest,
	liveIntentTagManifest,
	adrollPixelManifest,
	vectorManifest,
	pendoManifest,
	luckyOrangeManifest,
	rb2bManifest,
	optimizelyWebManifest,
	dynamicYieldManifest,
	adobeTargetManifest,
	appcuesManifest,
	wisepopsManifest,
	marketoManifest,
	pardotTrackingManifest,
	attentiveTagManifest,
	customerIoManifest,
	insiderManifest,
	googleTagManagerManifest,
	gtagManifest,
	ahrefsAnalyticsManifest,
	adobeAnalyticsManifest,
	amplitudeManifest,
	cloudflareWebAnalyticsManifest,
	clearbitManifest,
	clarityManifest,
	databuddyManifest,
	fathomAnalyticsManifest,
	heapManifest,
	mixpanelAnalyticsManifest,
	oneDollarStatsManifest,
	hotjarManifest,
	hightouchManifest,
	logRocketManifest,
	matomoAnalyticsManifest,
	posthogManifest,
	promptwatchManifest,
	pirschManifest,
	rudderstackManifest,
	segmentManifest,
	sentryManifest,
	rybbitAnalyticsManifest,
	plausibleAnalyticsManifest,
	statableAnalyticsManifest,
	umamiAnalyticsManifest,
	vercelAnalyticsManifest,
	vercelSpeedInsightsManifest,
	crispManifest,
	frontChatManifest,
	intercomManifest,
	klaviyoManifest,
	metaPixelManifest,
	openaiPixelManifest,
	pinterestTagManifest,
	redditPixelManifest,
	tiktokPixelManifest,
	linkedinInsightsManifest,
	microsoftUetManifest,
	snapchatPixelManifest,
	xPixelManifest,
];

const getPublicScriptExportSubpaths =
	function getPublicScriptExportSubpaths(): string[] {
		return Object.keys(packageJson.exports)
			.filter(
				(key) =>
					key.startsWith('./') &&
					key !== '.' &&
					key !== './*' &&
					key !== './package.json' &&
					key !== './events' &&
					// A consent bridge, not a script integration.
					key !== './shopify' &&
					key !== './registry'
			)
			.map((key) => key.replace('./', ''));
	};

const getConditionCategories = function getConditionCategories(
	condition: IntegrationConsentCondition
): string[] {
	if (typeof condition === 'string') {
		return [condition];
	}
	if ('not' in condition) {
		return getConditionCategories(condition.not);
	}
	const operands = 'and' in condition ? condition.and : condition.or;
	expect(operands.length).toBeGreaterThan(0);
	return operands.flatMap((operand) => getConditionCategories(operand));
};

const expectUnique = function expectUnique(
	values: readonly string[],
	label: string
): void {
	expect(new Set(values).size, label).toBe(values.length);
};

describe('script integration registry', () => {
	it('keeps identity fields unique', () => {
		expectUnique(
			builtInScriptIntegrations.map((integration) => integration.key),
			'key'
		);
		expectUnique(
			builtInScriptIntegrations.map((integration) => integration.vendor),
			'vendor'
		);
		expectUnique(
			builtInScriptIntegrations.map(
				(integration) => integration.packageSubpath
			),
			'packageSubpath'
		);
	});

	it('matches package exports by public subpath', () => {
		const exportSubpaths = getPublicScriptExportSubpaths();
		const registrySubpaths = builtInScriptIntegrations.map(
			(integration) => integration.packageSubpath
		);

		expect([...exportSubpaths].sort()).toEqual([...registrySubpaths].sort());

		for (const subpath of exportSubpaths) {
			expect(getBuiltInScriptIntegrationBySubpath(subpath)).toBeDefined();
		}
	});

	it('uses declared integration and consent categories', () => {
		const integrationCategories = BUILT_IN_INTEGRATION_CATEGORIES.map(
			(category) => category.key
		);

		for (const integration of builtInScriptIntegrations) {
			expect(integrationCategories).toContain(integration.integrationCategory);
			for (const category of getConditionCategories(
				integration.consentCategory
			)) {
				expect(validConsentCategories).toContain(category);
			}
		}
	});

	it('matches vendor manifest ids', () => {
		// Zaraz uses imperative readiness listeners, not a vendor manifest.
		const manifestVendors = [
			...vendorManifests.map((manifest) => manifest.vendor),
			'cloudflare-zaraz',
		];
		const registryVendors = builtInScriptIntegrations.map(
			(integration) => integration.vendor
		);

		expect([...manifestVendors].sort()).toEqual([...registryVendors].sort());

		for (const vendor of manifestVendors) {
			expect(getBuiltInScriptIntegrationByVendor(vendor)).toBeDefined();
		}
	});

	it('runs helper parity cases from the registry list', () => {
		for (const integration of builtInScriptIntegrations) {
			const parityCase = helperParityCases[integration.key];

			expectScriptMatchesIntegration(
				getBuiltInScriptIntegration(integration.key).key,
				parityCase.script,
				parityCase.expected
			);
		}
	});
});
