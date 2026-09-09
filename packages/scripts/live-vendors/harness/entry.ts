/**
 * Browser-side harness for the live vendor monitor.
 *
 * Bundled with `Bun.build` and served into a real Chromium page by the
 * runner. Exposes a small window API that loads one vendor script through the
 * production `c15t` script loader and runs the probe checks defined in
 * `../vendors`.
 */
import { createConsentKernel } from '@c15t/core';
import type { ConsentState } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import type { ScriptLoaderHandle } from '@c15t/core/modules/script-loader';

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
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

const grantedConsents: ConsentState = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

const runCheck = function runCheck(
	check: (() => LiveProbeCheckResult) | undefined,
	missingDetail: string
): LiveProbeCheckResult {
	if (!check) {
		return { detail: missingDetail, ok: true };
	}

	try {
		return check();
	} catch (error) {
		return { detail: `check threw: ${String(error)}`, ok: false };
	}
};

/**
 * Pre-load global references captured per vendor, keyed by vendor id. Used to
 * prove the remote runtime replaced the bootstrap stub rather than the stub
 * merely still existing.
 */
const capturedStubRefs = new Map<string, Map<string, unknown>>();

/**
 * Loader handles per vendor. Each probe gets its own kernel seeded with the
 * requested consent state so the loader reconciles exactly once, on mount.
 */
const loaders = new Map<string, ScriptLoaderHandle>();

const windowRecord = function windowRecord(): Record<string, unknown> {
	return window as unknown as Record<string, unknown>;
};

const harness: LiveVendorProbeHarness = {
	/**
	 * Runs the vendor's runtime assertion.
	 *
	 * When the config declares `runtimeReplacedGlobals`, every listed global
	 * must be defined and differ by identity from the pre-load stub snapshot
	 * before any custom `runtimeCheck` runs — proving the remote bundle
	 * actually executed.
	 *
	 * @param vendor - Registry vendor id with a probe config.
	 * @returns The runtime assertion result; never throws across the
	 * `page.evaluate` boundary.
	 */
	check(vendor: string): LiveProbeCheckResult {
		const config = getLiveVendorProbeConfig(vendor);

		if (!config) {
			return { detail: `unknown vendor "${vendor}"`, ok: false };
		}

		if (config.runtimeReplacedGlobals) {
			const snapshot = capturedStubRefs.get(vendor);
			for (const name of config.runtimeReplacedGlobals) {
				const current = windowRecord()[name];
				if (current === undefined) {
					return {
						detail: `window.${name} is undefined after load`,
						ok: false,
					};
				}
				if (snapshot && current === snapshot.get(name)) {
					return {
						detail: `window.${name} still references the pre-load stub; the vendor runtime never replaced it`,
						ok: false,
					};
				}
			}

			if (!config.runtimeCheck) {
				return {
					detail: `vendor runtime replaced ${config.runtimeReplacedGlobals
						.map((name) => `window.${name}`)
						.join(', ')}`,
					ok: true,
				};
			}
		}

		return runCheck(config.runtimeCheck, 'no runtime check defined');
	},

	inspectStorage() {
		const cookieNames = document.cookie
			.split(';')
			.map((entry) => entry.split('=')[0]?.trim() ?? '')
			.filter((name) => name.length > 0);

		const localStorageKeys: string[] = [];
		try {
			for (let index = 0; index < window.localStorage.length; index += 1) {
				const key = window.localStorage.key(index);
				if (key !== null) {
					localStorageKeys.push(key);
				}
			}
		} catch {
			// Storage access can throw in exotic contexts; report what we have.
		}

		return { cookieNames, localStorageKeys };
	},

	/**
	 * Loads one vendor through the production script loader.
	 *
	 * @param vendor - Registry vendor id with a probe config.
	 * @param granted - Whether to load with granted (all categories) or denied
	 * (necessary-only) consent.
	 * @returns Whether the loader injected the script, its `alwaysLoad` flag,
	 * and the bootstrap assertion captured synchronously — before the remote
	 * loader can respond. Harness failures are serialized into `error` instead
	 * of throwing across the `page.evaluate` boundary.
	 */
	load(vendor: string, granted: boolean): LiveProbeLoadOutcome {
		const config = getLiveVendorProbeConfig(vendor);

		if (!config?.createScript) {
			return {
				alwaysLoad: false,
				bootstrap: { ok: false },
				error: `no probe config with createScript for vendor "${vendor}"`,
				requested: false,
			};
		}

		try {
			const script = config.createScript();
			let consents = deniedConsents;
			if (granted) {
				consents = grantedConsents;
			}
			loaders.get(vendor)?.dispose();
			const kernel = createConsentKernel();
			void kernel.commands.save(consents);
			const loader = createScriptLoader({ kernel, scripts: [script] });
			loaders.set(vendor, loader);
			const requested = loader.getLoadedScriptIds().includes(script.id);

			// Snapshot stub identities so the runtime phase can prove the real
			// SDK replaced them (a stub passing `typeof x === 'function'` is not
			// evidence the vendor runtime ever executed).
			if (requested && config.runtimeReplacedGlobals) {
				const snapshot = new Map<string, unknown>();
				for (const name of config.runtimeReplacedGlobals) {
					snapshot.set(name, windowRecord()[name]);
				}
				capturedStubRefs.set(vendor, snapshot);
			}

			// Bootstrap steps run synchronously in onBeforeLoad, so the queue
			// stubs must already exist here — before the remote loader responds.
			let bootstrap: LiveProbeCheckResult = {
				detail: 'script not loaded; bootstrap not asserted',

				ok: true,
			};
			if (requested) {
				bootstrap = runCheck(
					config.bootstrapCheck,
					'no bootstrap contract declared for this vendor (attribute-based loaders seed no globals)'
				);
			}

			return {
				alwaysLoad: script.alwaysLoad === true,
				bootstrap,

				requested,
			};
		} catch (error) {
			return {
				alwaysLoad: false,
				bootstrap: { ok: false },
				error: String(error),

				requested: false,
			};
		}
	},

	vendors: liveVendorProbeConfigs.map((config) => config.vendor),
};

window.__c15tLiveVendorProbe = harness;
