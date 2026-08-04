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

/**
 * Pre-load global references captured per vendor, keyed by vendor id. Used to
 * prove the remote runtime replaced the bootstrap stub rather than the stub
 * merely still existing.
 */
const capturedStubRefs = new Map<string, Map<string, unknown>>();

function windowRecord(): Record<string, unknown> {
	return window as unknown as Record<string, unknown>;
}

const harness: LiveVendorProbeHarness = {
	vendors: liveVendorProbeConfigs.map((config) => config.vendor),

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
				requested: false,
				alwaysLoad: false,
				bootstrap: { ok: false },
				error: `no probe config with createScript for vendor "${vendor}"`,
			};
		}

		try {
			const script = config.createScript();
			let consents = deniedConsents;
			if (granted) {
				consents = grantedConsents;
			}
			const loadedIds = loadScripts([script], consents);
			const requested = loadedIds.includes(script.id);

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
				ok: true,
				detail: 'script not loaded; bootstrap not asserted',
			};
			if (requested) {
				bootstrap = runCheck(
					config.bootstrapCheck,
					'no bootstrap contract declared for this vendor (attribute-based loaders seed no globals)'
				);
			}

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
			return { ok: false, detail: `unknown vendor "${vendor}"` };
		}

		if (config.runtimeReplacedGlobals) {
			const snapshot = capturedStubRefs.get(vendor);
			for (const name of config.runtimeReplacedGlobals) {
				const current = windowRecord()[name];
				if (current === undefined) {
					return {
						ok: false,
						detail: `window.${name} is undefined after load`,
					};
				}
				if (snapshot && current === snapshot.get(name)) {
					return {
						ok: false,
						detail: `window.${name} still references the pre-load stub; the vendor runtime never replaced it`,
					};
				}
			}

			if (!config.runtimeCheck) {
				return {
					ok: true,
					detail: `vendor runtime replaced ${config.runtimeReplacedGlobals
						.map((name) => `window.${name}`)
						.join(', ')}`,
				};
			}
		}

		return runCheck(config.runtimeCheck, 'no runtime check defined');
	},

	version(vendor: string): string | undefined {
		try {
			const runtimeVersion =
				getLiveVendorProbeConfig(vendor)?.runtimeVersion?.();
			return typeof runtimeVersion === 'string' ? runtimeVersion : undefined;
		} catch {
			return undefined;
		}
	},

	inspectStorage() {
		const cookieNames = document.cookie
			.split(';')
			.map((entry) => entry.split('=')[0]?.trim() ?? '')
			.filter((name) => name.length > 0);

		const localStorageKeys: string[] = [];
		try {
			for (let index = 0; index < window.localStorage.length; index++) {
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
};

window.__c15tLiveVendorProbe = harness;
