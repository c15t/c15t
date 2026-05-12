import type { AllConsentNames } from 'c15t';
import { describe, expect, it } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };
import { expectScriptMatchesIntegration } from './__tests__/helpers';
import {
	BUILT_IN_INTEGRATION_CATEGORIES,
	type BuiltInScriptIntegrationKey,
	builtInScriptIntegrations,
	getBuiltInScriptIntegration,
	getBuiltInScriptIntegrationBySubpath,
	getBuiltInScriptIntegrationByVendor,
} from './registry';
import {
	linkedinInsights,
	linkedinInsightsManifest,
} from './vendors/ads-and-pixels/linkedin-insights';
import {
	metaPixel,
	metaPixelManifest,
} from './vendors/ads-and-pixels/meta-pixel';
import {
	microsoftUet,
	microsoftUetManifest,
} from './vendors/ads-and-pixels/microsoft-uet';
import {
	redditPixel,
	redditPixelManifest,
} from './vendors/ads-and-pixels/reddit-pixel';
import {
	snapchatPixel,
	snapchatPixelManifest,
} from './vendors/ads-and-pixels/snapchat-pixel';
import {
	tiktokPixel,
	tiktokPixelManifest,
} from './vendors/ads-and-pixels/tiktok-pixel';
import { xPixel, xPixelManifest } from './vendors/ads-and-pixels/x-pixel';
import {
	ahrefsAnalytics,
	ahrefsAnalyticsManifest,
} from './vendors/analytics/ahrefs-analytics';
import { clarity, clarityManifest } from './vendors/analytics/clarity';
import {
	cloudflareWebAnalytics,
	cloudflareWebAnalyticsManifest,
} from './vendors/analytics/cloudflare-web-analytics';
import { databuddy, databuddyManifest } from './vendors/analytics/databuddy';
import {
	fathomAnalytics,
	fathomAnalyticsManifest,
} from './vendors/analytics/fathom-analytics';
import { gtag, gtagManifest } from './vendors/analytics/google-tag';
import { hotjar, hotjarManifest } from './vendors/analytics/hotjar';
import {
	matomoAnalytics,
	matomoAnalyticsManifest,
} from './vendors/analytics/matomo-analytics';
import {
	mixpanelAnalytics,
	mixpanelAnalyticsManifest,
} from './vendors/analytics/mixpanel-analytics';
import {
	plausibleAnalytics,
	plausibleAnalyticsManifest,
} from './vendors/analytics/plausible-analytics';
import { posthog, posthogManifest } from './vendors/analytics/posthog';
import {
	promptwatch,
	promptwatchManifest,
} from './vendors/analytics/promptwatch';
import {
	rybbitAnalytics,
	rybbitAnalyticsManifest,
} from './vendors/analytics/rybbit-analytics';
import { segment, segmentManifest } from './vendors/analytics/segment';
import {
	umamiAnalytics,
	umamiAnalyticsManifest,
} from './vendors/analytics/umami-analytics';
import {
	vercelAnalytics,
	vercelAnalyticsManifest,
} from './vendors/analytics/vercel-analytics';
import { crisp, crispManifest } from './vendors/functional/crisp';
import { intercom, intercomManifest } from './vendors/functional/intercom';
import {
	googleTagManager,
	googleTagManagerManifest,
} from './vendors/tag-managers/google-tag-manager';

const validConsentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const satisfies readonly AllConsentNames[];

const helperParityCases = {
	googleTagManager: {
		script: googleTagManager({ id: 'GTM-123' }),
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://www.googletagmanager.com/gtm.js?id=GTM-123',
		},
	},
	gtag: {
		script: gtag({ id: 'G-123', category: 'measurement' }),
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: true,
			src: 'https://www.googletagmanager.com/gtag/js?id=G-123',
		},
	},
	ahrefsAnalytics: {
		script: ahrefsAnalytics({ key: 'ahrefs-key' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://analytics.ahrefs.com/analytics.js',
		},
	},
	cloudflareWebAnalytics: {
		script: cloudflareWebAnalytics({ token: 'tok-abc' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.cloudflareinsights.com/beacon.min.js',
		},
	},
	clarity: {
		script: clarity({ id: 'abcdef1234' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://www.clarity.ms/tag/abcdef1234',
		},
	},
	databuddy: {
		script: databuddy({
			clientId: 'db_123',
			configWhenGranted: { clientId: 'db_123', disabled: false },
			configWhenDenied: { clientId: 'db_123', disabled: true },
		}),
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.databuddy.cc/databuddy.js',
		},
	},
	fathomAnalytics: {
		script: fathomAnalytics({ site: 'SITE123' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.usefathom.com/script.js',
		},
	},
	mixpanelAnalytics: {
		script: mixpanelAnalytics({
			token: '1234567890abcdef1234567890abcdef',
		}),
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		},
	},
	hotjar: {
		script: hotjar({ siteId: 1234567 }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.hotjar.com/c/hotjar-1234567.js?sv=6',
		},
	},
	matomoAnalytics: {
		script: matomoAnalytics({
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
		}),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://analytics.example.com/matomo.js',
		},
	},
	posthog: {
		script: posthog({ id: 'phc_123' }),
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://eu-assets.i.posthog.com/static/array.js',
		},
	},
	promptwatch: {
		script: promptwatch({
			projectId: '7d60345b-27bb-4779-a385-d4fc19ce732c',
		}),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://ingest.promptwatch.com/js/client.min.js',
		},
	},
	segment: {
		script: segment({ writeKey: 'abc123xyz456' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.segment.com/analytics.js/v1/abc123xyz456/analytics.min.js',
		},
	},
	rybbitAnalytics: {
		script: rybbitAnalytics({ siteId: 'rybbit-123' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://app.rybbit.io/api/script.js',
		},
	},
	plausibleAnalytics: {
		script: plausibleAnalytics({ domain: 'example.com' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://plausible.io/js/script.js',
		},
	},
	umamiAnalytics: {
		script: umamiAnalytics({ websiteId: 'site-abc' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cloud.umami.is/script.js',
		},
	},
	vercelAnalytics: {
		script: vercelAnalytics(),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://va.vercel-scripts.com/v1/script.js',
		},
	},
	crisp: {
		script: crisp({ websiteId: 'crisp-123' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://client.crisp.chat/l.js',
		},
	},
	intercom: {
		script: intercom({ appId: 'abc123' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://widget.intercom.io/widget/abc123',
		},
	},
	metaPixel: {
		script: metaPixel({ pixelId: '123456' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://connect.facebook.net/en_US/fbevents.js',
		},
	},
	redditPixel: {
		script: redditPixel({ pixelId: 't2_abcdef' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://www.redditstatic.com/ads/pixel.js',
		},
	},
	tiktokPixel: {
		script: tiktokPixel({ pixelId: 'tt-123' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=tt-123&lib=ttq',
		},
	},
	linkedinInsights: {
		script: linkedinInsights({ id: '987654' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		},
	},
	microsoftUet: {
		script: microsoftUet({ id: 'uet-123' }),
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: true,
			src: '//bat.bing.com/bat.js',
		},
	},
	snapchatPixel: {
		script: snapchatPixel({ pixelId: '123456789012345' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://sc-static.net/scevent.min.js',
		},
	},
	xPixel: {
		script: xPixel({ pixelId: 'tw-123' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.ads-twitter.com/uwt.js',
		},
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

const vendorManifests = [
	googleTagManagerManifest,
	gtagManifest,
	ahrefsAnalyticsManifest,
	cloudflareWebAnalyticsManifest,
	clarityManifest,
	databuddyManifest,
	fathomAnalyticsManifest,
	mixpanelAnalyticsManifest,
	hotjarManifest,
	matomoAnalyticsManifest,
	posthogManifest,
	promptwatchManifest,
	segmentManifest,
	rybbitAnalyticsManifest,
	plausibleAnalyticsManifest,
	umamiAnalyticsManifest,
	vercelAnalyticsManifest,
	crispManifest,
	intercomManifest,
	metaPixelManifest,
	redditPixelManifest,
	tiktokPixelManifest,
	linkedinInsightsManifest,
	microsoftUetManifest,
	snapchatPixelManifest,
	xPixelManifest,
];

function getPublicScriptExportSubpaths(): string[] {
	return Object.keys(packageJson.exports)
		.filter((key) => key !== './*' && key !== './registry')
		.map((key) => key.replace('./', ''));
}

function expectUnique(values: readonly string[], label: string): void {
	expect(new Set(values).size, label).toBe(values.length);
}

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
			expect(validConsentCategories).toContain(integration.consentCategory);
		}
	});

	it('matches vendor manifest ids', () => {
		const manifestVendors = vendorManifests.map((manifest) => manifest.vendor);
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
