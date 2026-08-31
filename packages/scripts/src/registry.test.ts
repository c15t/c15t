import type { AllConsentNames } from '@c15t/core';
import { describe, expect, it } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };
import { expectScriptMatchesIntegration } from './__tests__/helpers';
import {
	BUILT_IN_INTEGRATION_CATEGORIES,
	builtInScriptIntegrations,
	getBuiltInScriptIntegration,
	getBuiltInScriptIntegrationBySubpath,
	getBuiltInScriptIntegrationByVendor,
} from './registry';
import type { BuiltInScriptIntegrationKey } from './registry';
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
	adobeAnalytics,
	adobeAnalyticsManifest,
} from './vendors/analytics/adobe-analytics';
import {
	ahrefsAnalytics,
	ahrefsAnalyticsManifest,
} from './vendors/analytics/ahrefs-analytics';
import { amplitude, amplitudeManifest } from './vendors/analytics/amplitude';
import { clearbit, clearbitManifest } from './vendors/analytics/clearbit';
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
import { heap, heapManifest } from './vendors/analytics/heap';
import { hightouch, hightouchManifest } from './vendors/analytics/hightouch';
import { hotjar, hotjarManifest } from './vendors/analytics/hotjar';
import { logRocket, logRocketManifest } from './vendors/analytics/logrocket';
import {
	matomoAnalytics,
	matomoAnalyticsManifest,
} from './vendors/analytics/matomo-analytics';
import {
	clarity,
	clarityManifest,
} from './vendors/analytics/microsoft-clarity';
import {
	mixpanelAnalytics,
	mixpanelAnalyticsManifest,
} from './vendors/analytics/mixpanel-analytics';
import { pirsch, pirschManifest } from './vendors/analytics/pirsch';
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
	rudderstack,
	rudderstackManifest,
} from './vendors/analytics/rudderstack';
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
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.amplitude.com/libs/analytics-browser-2.44.4-min.js.gz',
		},
		script: amplitude({ apiKey: 'AMPLITUDE-CONTRACT' }),
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
	crisp: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://client.crisp.chat/l.js',
		},
		script: crisp({ websiteId: 'crisp-123' }),
	},
	databuddy: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.databuddy.cc/databuddy.js',
		},
		script: databuddy({
			clientId: 'db_123',
			configWhenDenied: { clientId: 'db_123', disabled: true },

			configWhenGranted: { clientId: 'db_123', disabled: false },
		}),
	},
	fathomAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.usefathom.com/script.js',
		},
		script: fathomAnalytics({ site: 'SITE123' }),
	},
	googleTagManager: {
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://www.googletagmanager.com/gtm.js?id=GTM-123',
		},
		script: googleTagManager({ id: 'GTM-123' }),
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
	intercom: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://widget.intercom.io/widget/abc123',
		},
		script: intercom({ appId: 'abc123' }),
	},
	linkedinInsights: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		},
		script: linkedinInsights({ id: '987654' }),
	},
	logRocket: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.logrocket.io/LogRocket.min.js',
		},
		script: logRocket({ appId: 'c15tfake/c15tfake' }),
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
	snapchatPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://sc-static.net/scevent.min.js',
		},
		script: snapchatPixel({ pixelId: '123456789012345' }),
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
	vercelAnalytics: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://va.vercel-scripts.com/v1/script.js',
		},
		script: vercelAnalytics(),
	},
	xPixel: {
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.ads-twitter.com/uwt.js',
		},
		script: xPixel({ pixelId: 'tw-123' }),
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
	adobeAnalyticsManifest,
	amplitudeManifest,
	cloudflareWebAnalyticsManifest,
	clearbitManifest,
	clarityManifest,
	databuddyManifest,
	fathomAnalyticsManifest,
	heapManifest,
	mixpanelAnalyticsManifest,
	hotjarManifest,
	hightouchManifest,
	logRocketManifest,
	matomoAnalyticsManifest,
	posthogManifest,
	promptwatchManifest,
	pirschManifest,
	rudderstackManifest,
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

const getPublicScriptExportSubpaths =
	function getPublicScriptExportSubpaths(): string[] {
		return Object.keys(packageJson.exports)
			.filter(
				(key) =>
					key.startsWith('./') &&
					key !== '.' &&
					key !== './*' &&
					key !== './package.json' &&
					key !== './registry'
			)
			.map((key) => key.replace('./', ''));
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
