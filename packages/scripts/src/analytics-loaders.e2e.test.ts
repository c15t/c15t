/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { ahrefsAnalytics } from './vendors/analytics/ahrefs-analytics';
import { cloudflareWebAnalytics } from './vendors/analytics/cloudflare-web-analytics';
import { fathomAnalytics } from './vendors/analytics/fathom-analytics';
import { promptwatch } from './vendors/analytics/promptwatch';
import { rybbitAnalytics } from './vendors/analytics/rybbit-analytics';
import { umamiAnalytics } from './vendors/analytics/umami-analytics';

describe('analytics loader contracts', () => {
	registerVendorContractCleanup();

	it('exposes Ahrefs loader attributes before append', () => {
		let attributes: Record<string, string | boolean | null> | undefined;

		installHeadProbe((node) => {
			if (!node.src.includes('analytics.ahrefs.com/analytics.js')) {
				return;
			}

			attributes = {
				async: node.async,
				dataKey: node.getAttribute('data-key'),
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...ahrefsAnalytics({ key: 'AHREFS-CONTRACT' }),
					id: 'ahrefs-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(attributes).toEqual({
			async: true,
			dataKey: 'AHREFS-CONTRACT',
		});
	});

	it('serializes Cloudflare beacon config before append', () => {
		let beaconConfig: Record<string, unknown> | undefined;
		let defer: boolean | undefined;

		installHeadProbe((node) => {
			if (!node.src.includes('static.cloudflareinsights.com/beacon.min.js')) {
				return;
			}

			const rawConfig = node.getAttribute('data-cf-beacon');
			if (typeof rawConfig === 'string') {
				beaconConfig = JSON.parse(rawConfig) as Record<string, unknown>;
			} else {
				beaconConfig = undefined;
			}
			defer = node.defer;
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...cloudflareWebAnalytics({
						spa: false,
						token: 'CLOUDFLARE-CONTRACT',
					}),
					id: 'cloudflare-web-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(beaconConfig).toEqual({
			spa: false,
			token: 'CLOUDFLARE-CONTRACT',
		});
		expect(defer).toBe(true);
	});

	it('exposes Fathom loader options as data attributes', () => {
		let attributes: Record<string, string | boolean | null> | undefined;

		installHeadProbe((node) => {
			if (!node.src.includes('cdn.usefathom.com/script.js')) {
				return;
			}

			attributes = {
				dataAuto: node.getAttribute('data-auto'),
				dataCanonical: node.getAttribute('data-canonical'),
				dataHonorDnt: node.getAttribute('data-honor-dnt'),
				dataSite: node.getAttribute('data-site'),
				dataSpa: node.getAttribute('data-spa'),
				defer: node.defer,
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...fathomAnalytics({
						auto: false,
						canonical: true,
						honorDnt: true,
						site: 'FATHOM-CONTRACT',
						spa: 'history',
					}),
					id: 'fathom-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(attributes).toEqual({
			dataAuto: 'false',
			dataCanonical: 'true',
			dataHonorDnt: 'true',
			dataSite: 'FATHOM-CONTRACT',
			dataSpa: 'history',
			defer: true,
		});
	});

	it('exposes Promptwatch project id before append', () => {
		let attributes: Record<string, string | boolean | null> | undefined;

		installHeadProbe((node) => {
			if (!node.src.includes('ingest.promptwatch.com/js/client.min.js')) {
				return;
			}

			attributes = {
				async: node.async,
				dataProjectId: node.getAttribute('data-project-id'),
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...promptwatch({ projectId: 'PROMPTWATCH-CONTRACT' }),
					id: 'promptwatch-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(attributes).toEqual({
			async: true,
			dataProjectId: 'PROMPTWATCH-CONTRACT',
		});
	});

	it('exposes Rybbit loader configuration before append', () => {
		let attributes: Record<string, string | boolean | null> | undefined;

		installHeadProbe((node) => {
			if (!node.src.includes('analytics.example.com/script.js')) {
				return;
			}

			attributes = {
				dataApiKey: node.getAttribute('data-api-key'),
				dataAutoTrackPageview: node.getAttribute('data-auto-track-pageview'),
				dataDebounce: node.getAttribute('data-debounce'),
				dataMaskPatterns: node.getAttribute('data-mask-patterns'),
				dataSessionReplay: node.getAttribute('data-session-replay'),
				dataSiteId: node.getAttribute('data-site-id'),
				dataSkipPatterns: node.getAttribute('data-skip-patterns'),
				dataTrackErrors: node.getAttribute('data-track-errors'),
				dataTrackOutbound: node.getAttribute('data-track-outbound'),
				dataTrackQuery: node.getAttribute('data-track-query'),
				dataTrackSpa: node.getAttribute('data-track-spa'),
				dataWebVitals: node.getAttribute('data-web-vitals'),
				defer: node.defer,
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...rybbitAnalytics({
						analyticsHost: 'https://analytics.example.com',
						apiKey: 'RYBBIT-API-KEY',
						autoTrackPageview: false,
						debounce: 250,
						maskPatterns: ['/account/*'],
						sessionReplay: true,
						siteId: 'RYBBIT-CONTRACT',
						skipPatterns: ['/admin/*'],
						trackErrors: true,
						trackOutbound: true,
						trackQuery: true,
						trackSpa: true,
						webVitals: true,
					}),
					id: 'rybbit-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(attributes).toEqual({
			dataApiKey: 'RYBBIT-API-KEY',
			dataAutoTrackPageview: 'false',
			dataDebounce: '250',
			dataMaskPatterns: '["/account/*"]',
			dataSessionReplay: 'true',
			dataSiteId: 'RYBBIT-CONTRACT',
			dataSkipPatterns: '["/admin/*"]',
			dataTrackErrors: 'true',
			dataTrackOutbound: 'true',
			dataTrackQuery: 'true',
			dataTrackSpa: 'true',
			dataWebVitals: 'true',
			defer: true,
		});
	});

	it('exposes Umami loader configuration before append', () => {
		let attributes: Record<string, string | boolean | null> | undefined;

		installHeadProbe((node) => {
			if (!node.src.includes('cloud.umami.is/script.js')) {
				return;
			}

			attributes = {
				dataAutoTrack: node.getAttribute('data-auto-track'),
				dataBeforeSend: node.getAttribute('data-before-send'),
				dataDomains: node.getAttribute('data-domains'),
				dataHostUrl: node.getAttribute('data-host-url'),
				dataTag: node.getAttribute('data-tag'),
				dataWebsiteId: node.getAttribute('data-website-id'),
				defer: node.defer,
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...umamiAnalytics({
						autoTrack: false,
						beforeSend: 'beforeSendHook',
						domains: ['example.com', 'www.example.com'],
						hostUrl: 'https://analytics.example.com',
						tag: 'canary',
						websiteId: 'UMAMI-CONTRACT',
					}),
					id: 'umami-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(attributes).toEqual({
			dataAutoTrack: 'false',
			dataBeforeSend: 'beforeSendHook',
			dataDomains: '["example.com","www.example.com"]',
			dataHostUrl: 'https://analytics.example.com',
			dataTag: 'canary',
			dataWebsiteId: 'UMAMI-CONTRACT',
			defer: true,
		});
	});
});
