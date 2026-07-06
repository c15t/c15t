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
