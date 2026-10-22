import { describe, expect, it } from 'vitest';

import { builtInScriptIntegrations } from '../src/registry';
import { assertsRuntime } from './probe-policy';
import type { LiveVendorProbeConfig } from './types';
import { liveVendorProbeConfigs } from './vendors';

const configsForVendor = function configsForVendor(
	vendor: string
): LiveVendorProbeConfig[] {
	return liveVendorProbeConfigs.filter((config) => config.vendor === vendor);
};

describe('live vendor probe configs', () => {
	it('covers every built-in script integration exactly once', () => {
		for (const integration of builtInScriptIntegrations) {
			expect(configsForVendor(integration.vendor)).toHaveLength(1);
		}

		expect(liveVendorProbeConfigs).toHaveLength(
			builtInScriptIntegrations.length
		);
	});

	it('defines loader construction for every non-skip config', () => {
		for (const config of liveVendorProbeConfigs) {
			if (config.tier === 'skip') {
				continue;
			}

			expect(config.createScript, config.vendor).toBeTypeOf('function');
			expect(config.loaderUrlSubstring, config.vendor).toBeTypeOf('string');
			expect(config.loaderUrlSubstring, config.vendor).not.toBe('');
		}
	});

	it('documents every skip config', () => {
		for (const config of liveVendorProbeConfigs) {
			if (config.tier !== 'skip') {
				continue;
			}

			expect(config.skipReason, config.vendor).toBeTypeOf('string');
			expect(config.skipReason, config.vendor).not.toBe('');
		}
	});

	it('allows Pinterest runtime bundles while blocking collection endpoints', () => {
		const [config] = configsForVendor('pinterest-tag');
		const allowedUrls = [
			config?.loaderUrlSubstring,
			...(config?.allowUrlSubstrings ?? []),
		].filter((value): value is string => Boolean(value));
		const isAllowed = (url: string) =>
			allowedUrls.some((substring) => url.includes(substring));

		expect(isAllowed('https://s.pinimg.com/ct/core.js')).toBe(true);
		expect(isAllowed('https://s.pinimg.com/ct/lib/main.340b6cee.js')).toBe(
			true
		);
		expect(isAllowed('https://ct.pinterest.com/v3/')).toBe(false);
		expect(isAllowed('https://ct.pinterest.com/stats/')).toBe(false);
	});

	it('allows Customer.io settings and SDK chunks while blocking collection', () => {
		const [config] = configsForVendor('customer-io');
		const allowed = [
			config?.loaderUrlSubstring,
			...(config?.allowUrlSubstrings ?? []),
		].filter((value): value is string => Boolean(value));
		const isAllowed = (url: string) =>
			allowed.some((substring) => url.includes(substring));
		expect(
			isAllowed(
				'https://cdp.customer.io/v1/projects/47e549aabef763c4f2fc/settings'
			)
		).toBe(true);
		expect(
			isAllowed('https://cdp.customer.io/v1/analytics-js/inAppPlugin.js')
		).toBe(true);
		expect(isAllowed('https://cdp.customer.io/v1/m')).toBe(false);
		expect(isAllowed('https://cdp.customer.io/v1/track')).toBe(false);
	});

	it('allows Ada rollout assets while blocking Agent and collection endpoints', () => {
		const [config] = configsForVendor('ada');
		const allowedUrls = [
			config?.loaderUrlSubstring,
			...(config?.allowUrlSubstrings ?? []),
		].filter((value): value is string => Boolean(value));
		const isAllowed = (url: string) =>
			allowedUrls.some((substring) => url.includes(substring));
		const assets = 'https://messaging-assets.ada.support';
		const futureVersion = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

		for (const path of [
			'/sdk.js',
			'/messaging-manifest.json',
			'/messaging-stable-version.txt',
			`/${futureVersion}/sdk/index.js`,
			`/${futureVersion}/sdk/core.html?ada_handle=c15t-live-probe-placeholder`,
			`/${futureVersion}/sdk/button.html?ada_handle=c15t-live-probe-placeholder`,
			`/${futureVersion}/core/index.js`,
			`/${futureVersion}/core/chunk-future.js`,
			`/${futureVersion}/core/styles.css`,
			`/${futureVersion}/core/font.woff2`,
		]) {
			expect.soft(isAllowed(`${assets}${path}`), path).toBe(true);
		}

		for (const url of [
			'https://c15t-live-probe-placeholder.ada.support/api/?ada_request_origin=embed',
			'https://c15t-live-probe-placeholder.eu.ada.support/api/',
			'https://c15t-live-probe-placeholder.us2.ada.support/api/',
			'https://rollout.ada.support/c15t-live-probe-placeholder/client.json',
			'https://api.ada.support/collect',
			'https://o38990.ingest.us.sentry.io/api/4510980191027200/envelope/',
			'https://messaging-assets.ada.support.example.com/collect',
		]) {
			expect.soft(isAllowed(url), url).toBe(false);
		}
	});

	it('uses an obvious placeholder account for the RB2B reachability probe', () => {
		const [config] = configsForVendor('rb2b');
		const loaderPath =
			'ddwl4m2hdecbv.cloudfront.net/b/C15TFAKERB2BKEY/C15TFAKERB2BKEY.js.gz';

		expect(config?.createScript?.().src).toBe(`https://${loaderPath}`);
		expect(config?.loaderUrlSubstring).toBe(loaderPath);
		expect(config?.tier).toBe('loader-only');
	});

	it('documents every vendor that asserts no runtime behavior', () => {
		// A vendor whose loader answers placeholder credentials with an error
		// page cannot prove its SDK started, so the probe reduces to "the
		// endpoint exists". That is a real coverage gap — the exact kind that
		// hides a loader contract change — so it has to be written down rather
		// than inferred from an absent field.
		const gaps: string[] = [];

		for (const config of liveVendorProbeConfigs) {
			if (config.tier === 'skip') {
				continue;
			}

			if (assertsRuntime(config)) {
				continue;
			}

			expect(
				config.notes?.trim(),
				`${config.vendor} asserts no runtime behavior and must explain the gap in notes`
			).toBeTruthy();
			gaps.push(config.vendor);
		}

		// Snapshot the gap list so shrinking it is deliberate and growing it is
		// impossible to land unnoticed.
		expect(gaps.sort()).toEqual([
			'ada',
			'adobe-analytics',
			'adobe-target',
			'appcues',
			'clearbit',
			'crisp',
			'dynamic-yield',
			'google-tag-manager',
			'gorgias',
			'hotjar',
			'insider',
			'intercom',
			'linkedin-insights',
			'matomo-analytics',
			'optimizely',
			'rb2b',
			'segment',
			'vercel-analytics',
			'zendesk',
			'wisepops',
		]);
	});

	it('requires a denied-consent probe for every alwaysLoad vendor', () => {
		for (const config of liveVendorProbeConfigs) {
			if (config.tier === 'skip' || !config.createScript) {
				continue;
			}

			const script = config.createScript();
			if (script.alwaysLoad !== true) {
				continue;
			}
			expect(
				config.deniedConsentProbe,
				`${config.vendor} loads for every visitor and must assert denied-consent egress`
			).toBeDefined();
		}
	});

	it('constructs scripts whose ids match the configured vendor', () => {
		for (const config of liveVendorProbeConfigs) {
			if (config.tier === 'skip') {
				continue;
			}

			const script = config.createScript?.();

			expect(script, config.vendor).toBeDefined();
			expect(script?.id).toBe(config.vendor);
		}
	});
});
