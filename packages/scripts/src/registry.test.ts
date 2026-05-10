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
	tiktokPixel,
	tiktokPixelManifest,
} from './vendors/ads-and-pixels/tiktok-pixel';
import { xPixel, xPixelManifest } from './vendors/ads-and-pixels/x-pixel';
import { databuddy, databuddyManifest } from './vendors/analytics/databuddy';
import { gtag, gtagManifest } from './vendors/analytics/google-tag';
import {
	plausibleAnalytics,
	plausibleAnalyticsManifest,
} from './vendors/analytics/plausible-analytics';
import { posthog, posthogManifest } from './vendors/analytics/posthog';
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
	posthog: {
		script: posthog({ id: 'phc_123' }),
		expected: {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://eu-assets.i.posthog.com/static/array.js',
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
	metaPixel: {
		script: metaPixel({ pixelId: '123456' }),
		expected: {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://connect.facebook.net/en_US/fbevents.js',
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
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: '//bat.bing.com/bat.js',
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
	databuddyManifest,
	posthogManifest,
	plausibleAnalyticsManifest,
	metaPixelManifest,
	tiktokPixelManifest,
	linkedinInsightsManifest,
	microsoftUetManifest,
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
