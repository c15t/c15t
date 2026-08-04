import { describe, expect, it } from 'vitest';
import { builtInScriptIntegrations } from '../src/registry';
import type { LiveVendorProbeConfig } from './types';
import { liveVendorProbeConfigs } from './vendors';

function configsForVendor(vendor: string): LiveVendorProbeConfig[] {
	return liveVendorProbeConfigs.filter((config) => config.vendor === vendor);
}

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

			const assertsRuntime =
				Boolean(config.runtimeCheck) || Boolean(config.runtimeReplacedGlobals);
			if (assertsRuntime) {
				continue;
			}

			expect(
				config.notes,
				`${config.vendor} asserts no runtime behavior and must explain the gap in notes`
			).toBeTypeOf('string');
			gaps.push(config.vendor);
		}

		// Snapshot the gap list so shrinking it is deliberate and growing it is
		// impossible to land unnoticed.
		expect(gaps.sort()).toEqual([
			'adobe-analytics',
			'clearbit',
			'crisp',
			'google-tag-manager',
			'hotjar',
			'intercom',
			'linkedin-insights',
			'matomo-analytics',
			'segment',
			'vercel-analytics',
		]);
	});

	it('requires a denied-consent probe for every alwaysLoad vendor', () => {
		for (const config of liveVendorProbeConfigs) {
			if (config.tier === 'skip' || !config.createScript) {
				continue;
			}

			const script = config.createScript();
			if (script.alwaysLoad === true) {
				expect(
					config.deniedConsentProbe,
					`${config.vendor} loads for every visitor and must assert denied-consent egress`
				).toBeDefined();
			}
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
