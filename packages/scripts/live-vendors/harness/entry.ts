/**
 * Browser-side harness for the live vendor monitor.
 *
 * Bundled with `Bun.build` and served into a real Chromium page by the
 * runner. Exposes a small window API that loads one vendor script through the
 * production `c15t` script loader and runs the probe checks defined in
 * `../vendors`.
 */
import { type ConsentState, loadScripts } from 'c15t';
import type {
	LiveProbeCheckResult,
	LiveProbeLoadOutcome,
	LiveVendorProbeHarness,
} from '../types';
import { getLiveVendorProbeConfig, liveVendorProbeConfigs } from '../vendors';

declare global {
	interface Window {
		__c15tLiveVendorProbe?: LiveVendorProbeHarness;
	}
}

const deniedConsents: ConsentState = {
	necessary: true,
	functionality: false,
	experience: false,
	measurement: false,
	marketing: false,
};

const grantedConsents: ConsentState = {
	necessary: true,
	functionality: true,
	experience: true,
	measurement: true,
	marketing: true,
};

function runCheck(
	check: (() => LiveProbeCheckResult) | undefined,
	missingDetail: string
): LiveProbeCheckResult {
	if (!check) {
		return { ok: true, detail: missingDetail };
	}

	try {
		return check();
	} catch (error) {
		return { ok: false, detail: `check threw: ${String(error)}` };
	}
}

const harness: LiveVendorProbeHarness = {
	vendors: liveVendorProbeConfigs.map((config) => config.vendor),

	load(vendor: string, granted: boolean): LiveProbeLoadOutcome {
		const config = getLiveVendorProbeConfig(vendor);

		if (!config?.createScript) {
			return {
				requested: false,
				alwaysLoad: false,
				bootstrap: { ok: false },
				error: `no probe config with createScript for vendor "${vendor}"`,
			};
		}

		try {
			const script = config.createScript();
			const loadedIds = loadScripts(
				[script],
				granted ? grantedConsents : deniedConsents
			);
			const requested = loadedIds.includes(script.id);

			// Bootstrap steps run synchronously in onBeforeLoad, so the queue
			// stubs must already exist here — before the remote loader responds.
			const bootstrap = requested
				? runCheck(config.bootstrapCheck, 'no bootstrap check defined')
				: { ok: true, detail: 'script not loaded; bootstrap not asserted' };

			return {
				requested,
				alwaysLoad: script.alwaysLoad === true,
				bootstrap,
			};
		} catch (error) {
			return {
				requested: false,
				alwaysLoad: false,
				bootstrap: { ok: false },
				error: String(error),
			};
		}
	},

	check(vendor: string): LiveProbeCheckResult {
		const config = getLiveVendorProbeConfig(vendor);

		if (!config) {
			return { ok: false, detail: `unknown vendor "${vendor}"` };
		}

		return runCheck(config.runtimeCheck, 'no runtime check defined');
	},
};

window.__c15tLiveVendorProbe = harness;
