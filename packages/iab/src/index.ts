/**
 * `@c15t/iab` — IAB TCF 2.3 module for the c15t consent kernel.
 *
 * Consumes the `@c15t/core` kernel and provides CMP-compliant IAB TCF
 * functionality:
 * - Installs `window.__tcfapi` global (synchronous stub + async real
 *   implementation) so third-party vendors can discover the CMP.
 * - Fetches the Global Vendor List (GVL) with HTTP cache + in-flight
 *   deduplication. Respects `gvl: null` on the `/init` response
 *   (server-side non-IAB region opt-out).
 * - Encodes TCF 2.3 strings via lazy-loaded `@iabtechlabtcf/core` so
 *   the 50KB encoder only loads when `save()` is actually called.
 * - Persists vendor/purpose/LI/special-feature consent through
 *   `kernel.set.iab()`, preserving the framework-neutral kernel
 *   contract.
 *
 * Same public shape as v2's `@c15t/iab` but adapted to consume the
 * kernel rather than the Zustand store. Re-uses every pure utility
 * from v2: GVL fetcher, TC string encoder, purpose mapper, CMP API
 * (`createCMPApi`), stub installer (`initializeIABStub`).
 */

import { registerIABControls } from '@c15t/core';
import type {
	CMPApi,
	ConsentKernel,
	ConsentSnapshot,
	GlobalVendorList,
	NonIABVendor,
} from '@c15t/core';

import { createCMPApi } from './tcf/cmp-api';
import { clearGVLCache, fetchGVL } from './tcf/fetch-gvl';
import { getTCFCore } from './tcf/lazy-load';
import {
	c15tConsentsToIabPurposes,
	iabPurposesToC15tConsents,
} from './tcf/purpose-mapping';
import { destroyIABStub as destroyStub, initializeIABStub } from './tcf/stub';
import { generateTCString } from './tcf/tc-string';

/**
 * Public option surface for `createIAB`. Mirrors v2's `IABUserConfig`
 * but threads the kernel through.
 */
export interface CreateIABOptions {
	/** The consent kernel to bind to. */
	kernel: ConsentKernel;
	/** IAB-registered CMP ID. Required for valid TCF string output. */
	cmpId: number;
	/** CMP version (often the package version). Default: 1. */
	cmpVersion?: number;
	/** Filter GVL to a specific vendor allowlist (optional). */
	vendors?: number[];
	/** Non-IAB vendors declared by the publisher. */
	customVendors?: NonIABVendor[];
	/** Publisher country code (ISO 3166-1 alpha-2). Default: 'US'. */
	publisherCountryCode?: string;
	/** Whether the CMP is service-specific. Default: true. */
	isServiceSpecific?: boolean;
	/** Store saved TC strings in cookies and localStorage. Default: true.
	 * Set false for an in-memory playground; the kernel save transport still runs.
	 */
	persistence?: boolean;
	/**
	 * Pre-loaded GVL. When supplied, skips the network fetch. Accepts
	 * `null` to explicitly disable IAB mode (non-IAB region).
	 */
	gvl?: GlobalVendorList | null;
	/**
	 * Override the GVL endpoint. Default: IAB's `gvl.consent.io`.
	 */
	gvlURL?: string;
}

/**
 * Provider-facing IAB configuration accepted by {@link iab}.
 *
 * The framework provider supplies the consent kernel when it mounts the
 * runtime module.
 */
export type IABUserConfig = Omit<CreateIABOptions, 'cmpId' | 'kernel'> & {
	/**
	 * IAB-registered CMP ID. Hosted providers can omit this when the backend
	 * returns the ID during initialization.
	 */
	cmpId?: number;
};

/** Configuration returned by {@link iab} for framework providers. */
export interface IABProviderConfig extends IABUserConfig {
	/** Enables the IAB addon in the framework provider. */
	enabled: true;
}

/**
 * Enables IAB TCF support for a framework consent provider.
 *
 * @param config - CMP and vendor configuration for the IAB runtime.
 * @returns Provider configuration with the IAB addon enabled.
 *
 * @example
 * ```tsx
 * import { iab } from '@c15t/iab';
 *
 * <ConsentProvider options={{
 *   mode: hosted({ url: '/api/c15t' }),
 *   iab: iab({ cmpId: 28, vendors: [1, 2, 755] }),
 * }}>
 *   {children}
 * </ConsentProvider>
 * ```
 */
const createIABProviderConfig = function createIABProviderConfig(
	config: IABUserConfig
): IABProviderConfig {
	return {
		...config,
		enabled: true,
	};
};

export { createIABProviderConfig as iab };

/**
 * Handle returned by `createIAB`. Provides imperative control over the
 * CMP state and a `dispose` method for teardown.
 */
export interface IABHandle {
	/** Tear down the CMP API + stub and disconnect kernel subscriptions. */
	dispose: () => void;
	/** The underlying CMP API instance (for advanced consumers). */
	readonly cmpApi: CMPApi | null;
	/** Set consent for a specific IAB vendor by ID. */
	setVendorConsent: (vendorId: string | number, value: boolean) => void;
	/** Set legitimate interest for a specific IAB vendor. */
	setVendorLegitimateInterest: (
		vendorId: string | number,
		value: boolean
	) => void;
	/** Set consent for a specific IAB purpose (1–11). */
	setPurposeConsent: (purposeId: number, value: boolean) => void;
	/** Set legitimate interest for a specific IAB purpose. */
	setPurposeLegitimateInterest: (purposeId: number, value: boolean) => void;
	/** Opt in/out of a special feature (1 = geo, 2 = device ID). */
	setSpecialFeatureOptIn: (featureId: number, value: boolean) => void;
	/** Flip every vendor + purpose consent to true. */
	acceptAll: () => void;
	/** Flip every vendor + purpose consent to false. */
	rejectAll: () => void;
	/**
	 * Encode the current state as a TCF 2.3 string and commit to the
	 * kernel (via `set.iab({ tcString })`). Does NOT call
	 * `kernel.commands.save()` — the caller decides whether to persist
	 * or just emit the string.
	 */
	generateTCString: () => Promise<string>;
	/**
	 * Generate the TC string, commit it to the kernel, and call
	 * `kernel.commands.save()` — the full save flow including backend
	 * round-trip (if a transport is configured).
	 */
	save: () => Promise<void>;
}

/**
 * Internal helper — synchronously seed the IAB snapshot with baseline
 * state so selectors have something to read immediately on mount.
 */
const seedInitialIAB = function seedInitialIAB(
	kernel: ConsentKernel,
	options: CreateIABOptions,
	gvl: GlobalVendorList | null
): void {
	kernel.set.iab({
		cmpId: options.cmpId,
		customVendors: options.customVendors ?? [],
		enabled: gvl !== null,
		gvl,
	});
};

/**
 * Pull the current IAB slice from the kernel snapshot, returning a
 * default-populated object when the slice hasn't been initialized yet.
 */
const readIAB = function readIAB(kernel: ConsentKernel) {
	return (
		kernel.getSnapshot().iab ?? {
			cmpId: null as number | null,
			customVendors: [] as NonIABVendor[],
			enabled: false,
			gvl: null as GlobalVendorList | null,
			purposeConsents: {} as Record<number, boolean>,
			purposeLegitimateInterests: {} as Record<number, boolean>,
			specialFeatureOptIns: {} as Record<number, boolean>,
			tcString: null as string | null,
			vendorConsents: {} as Record<string, boolean>,
			vendorLegitimateInterests: {} as Record<string, boolean>,
		}
	);
};

/**
 * Flip every vendor / purpose / legit-interest / special-feature to the
 * same value. Used by acceptAll / rejectAll.
 */
const applyBlanket = function applyBlanket(
	kernel: ConsentKernel,
	gvl: GlobalVendorList,
	value: boolean
): void {
	const vendors = [
		...Object.values(gvl.vendors ?? {}),
		...readIAB(kernel).customVendors,
	];
	const purposeIds = Object.keys(gvl.purposes ?? {}).map(Number);
	const specialFeatureIds = Object.keys(gvl.specialFeatures ?? {}).map(Number);

	const vendorConsents: Record<string, boolean> = {};
	const vendorLegitimateInterests: Record<string, boolean> = {};
	for (const vendor of vendors) {
		vendorConsents[vendor.id] = value && vendor.purposes.length > 0;
		vendorLegitimateInterests[vendor.id] =
			value && (vendor.legIntPurposes?.length ?? 0) > 0;
	}
	const purposeConsents: Record<number, boolean> = {};
	const purposeLegitimateInterests: Record<number, boolean> = {};
	for (const id of purposeIds) {
		purposeConsents[id] = value;
		purposeLegitimateInterests[id] = value;
	}
	const specialFeatureOptIns: Record<number, boolean> = {};
	for (const id of specialFeatureIds) {
		specialFeatureOptIns[id] = value;
	}

	kernel.set.iab({
		purposeConsents,
		purposeLegitimateInterests,
		specialFeatureOptIns,
		vendorConsents,
		vendorLegitimateInterests,
	});

	// Also map purposes → c15t categories so the top-level consent record
	// reflects the IAB choices.
	if (value) {
		const consents = iabPurposesToC15tConsents(purposeConsents);
		kernel.set.consent(consents);
	} else {
		kernel.set.consent({
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
		});
	}
};

export const createIAB = function createIAB(
	options: CreateIABOptions
): IABHandle {
	const {
		kernel,
		cmpId,
		cmpVersion = 1,
		vendors,
		gvl: preloadedGvl,
		gvlURL,
	} = options;

	// Seed the iab slice immediately so downstream consumers see the
	// cmpId + any preloaded GVL. If no GVL yet, `enabled` stays false
	// until fetch-gvl completes or the kernel's `/init` response
	// delivers one.
	seedInitialIAB(kernel, options, preloadedGvl ?? null);

	let cmpApi: CMPApi | null = null;
	let disposed = false;

	// Install the __tcfapi stub synchronously so vendor scripts that
	// load before our async initialization can queue calls.
	if (typeof window !== 'undefined' && typeof document !== 'undefined') {
		initializeIABStub();
	}

	// Resolve GVL asynchronously if not preloaded — then build the real
	// CMP API and replace the stub.
	const gvlPromise: Promise<GlobalVendorList | null> =
		preloadedGvl === undefined
			? (async () => {
					try {
						return await fetchGVL(vendors, { endpoint: gvlURL });
					} catch {
						return null;
					}
				})()
			: Promise.resolve(preloadedGvl);

	void (async () => {
		const gvl = await gvlPromise;
		if (disposed) {
			return;
		}
		if (gvl === null) {
			// Server / fetch says no-IAB. Mark disabled.
			kernel.set.iab({ enabled: false, gvl: null });
			return;
		}
		kernel.set.iab({ enabled: true, gvl });
		try {
			cmpApi = createCMPApi({
				cmpId,
				cmpVersion,
				gvl,
			});
		} catch {
			// Failing to install CMP API is non-fatal; kernel state is
			// still correct, the rest of the module just can't respond
			// to __tcfapi queries yet.
		}
	})();

	// Keep the CMP API state in sync with snapshot changes. v2 calls
	// `cmpApi.updateConsent(tcString)` on save — we mirror that here.
	const unsubscribe = kernel.subscribe((snapshot: ConsentSnapshot) => {
		if (!cmpApi) {
			return;
		}
		const tcString = snapshot.iab?.tcString ?? null;
		if (tcString) {
			cmpApi.updateConsent(tcString);
		}
	});

	const buildTCFConsentData = function buildTCFConsentData() {
		const iab = readIAB(kernel);
		const customIds = new Set(
			iab.customVendors.map((vendor) => String(vendor.id))
		);
		const registeredChoices = (choices: Record<string, boolean>) =>
			Object.fromEntries(
				Object.entries(choices).filter(
					([id]) =>
						Object.hasOwn(iab.gvl?.vendors ?? {}, id) && !customIds.has(id)
				)
			);
		// Custom choices stay in kernel state, never in registered TCF vectors.
		const vendorConsents = registeredChoices(iab.vendorConsents);
		const vendorLegitimateInterests = registeredChoices(
			iab.vendorLegitimateInterests
		);
		// `vendorsDisclosed` should reflect every vendor the CMP made
		// available to the user, per TCF 2.3. For MVP we mirror the set
		// of vendors whose consent has been considered.
		const disclosed: Record<string, boolean> = {};
		for (const id of Object.keys(vendorConsents)) {
			disclosed[id] = true;
		}
		for (const id of Object.keys(vendorLegitimateInterests)) {
			disclosed[id] = true;
		}
		return {
			purposeConsents: iab.purposeConsents,
			purposeLegitimateInterests: iab.purposeLegitimateInterests,
			specialFeatureOptIns: iab.specialFeatureOptIns,
			vendorConsents,
			vendorLegitimateInterests,
			vendorsDisclosed: disclosed,
		};
	};

	const generateTC = async function generateTC(): Promise<string> {
		const iab = readIAB(kernel);
		if (!iab.gvl) {
			throw new Error(
				'createIAB: cannot generate TC string — GVL not loaded yet.'
			);
		}
		// Lazy-load @iabtechlabtcf/core only when we actually encode.
		await getTCFCore();
		const consentData = buildTCFConsentData();
		const tcString = await generateTCString(consentData, iab.gvl, {
			cmpId,
			cmpVersion,
			isServiceSpecific: options.isServiceSpecific ?? true,
			publisherCountryCode: options.publisherCountryCode ?? 'US',
		});
		kernel.set.iab({ tcString });
		return tcString;
	};

	const handle: IABHandle = {
		acceptAll() {
			const { gvl } = readIAB(kernel);
			if (!gvl) {
				return;
			}
			applyBlanket(kernel, gvl, true);
		},
		get cmpApi() {
			return cmpApi;
		},
		dispose() {
			disposed = true;
			// oxlint-disable-next-line no-use-before-define -- Cleanup runs after this handle has been registered.
			unregisterControls();
			unsubscribe();
			if (cmpApi) {
				try {
					cmpApi.destroy();
				} catch {
					// swallow teardown errors
				}
				cmpApi = null;
			}
			if (typeof window !== 'undefined') {
				try {
					destroyStub();
				} catch {
					// swallow
				}
			}
		},
		generateTCString: generateTC,
		rejectAll() {
			const { gvl } = readIAB(kernel);
			if (!gvl) {
				return;
			}
			applyBlanket(kernel, gvl, false);
		},
		async save() {
			const consentData = buildTCFConsentData();
			const tcString = await generateTC();
			if (options.persistence !== false) {
				cmpApi?.saveToStorage(tcString);
			}
			cmpApi?.updateConsent(tcString, consentData);
			// Map purposes → c15t consents one more time to make sure
			// the final save payload reflects what we just generated.
			const purposes = readIAB(kernel).purposeConsents;
			const consents = iabPurposesToC15tConsents(purposes);
			const result = await kernel.commands.save(consents);
			if (!result.ok) {
				throw new Error('IAB consent could not be saved. Retry the save.');
			}
		},
		setPurposeConsent(id, value) {
			const current = readIAB(kernel).purposeConsents;
			if (current[id] === value) {
				return;
			}
			const next = { ...current, [id]: value };
			kernel.set.iab({ purposeConsents: next });
			// Also propagate to c15t categories so scripts/blockers see
			// the change.
			kernel.set.consent(iabPurposesToC15tConsents(next));
		},
		setPurposeLegitimateInterest(id, value) {
			const current = readIAB(kernel).purposeLegitimateInterests;
			if (current[id] === value) {
				return;
			}
			kernel.set.iab({
				purposeLegitimateInterests: { ...current, [id]: value },
			});
		},
		setSpecialFeatureOptIn(id, value) {
			const current = readIAB(kernel).specialFeatureOptIns;
			if (current[id] === value) {
				return;
			}
			kernel.set.iab({
				specialFeatureOptIns: { ...current, [id]: value },
			});
		},
		setVendorConsent(id, value) {
			const key = String(id);
			const current = readIAB(kernel).vendorConsents;
			if (current[key] === value) {
				return;
			}
			kernel.set.iab({
				vendorConsents: { ...current, [key]: value },
			});
		},
		setVendorLegitimateInterest(id, value) {
			const key = String(id);
			const current = readIAB(kernel).vendorLegitimateInterests;
			if (current[key] === value) {
				return;
			}
			kernel.set.iab({
				vendorLegitimateInterests: { ...current, [key]: value },
			});
		},
	};
	const unregisterControls = registerIABControls(kernel, handle);
	return handle;
};

export type { CMPApi, GlobalVendorList, NonIABVendor } from '@c15t/core';
export {
	type HeadlessIABBannerAction,
	type HeadlessIABBannerState,
	type HeadlessIABDialogAction,
	type HeadlessIABDialogData,
	type HeadlessIABDialogState,
	type HeadlessIABPreferenceTab,
	type HeadlessIABProcessedFeature,
	type HeadlessIABProcessedPurpose,
	type HeadlessIABProcessedSpecialFeature,
	type HeadlessIABProcessedStack,
	type HeadlessIABProcessedVendor,
	type HeadlessIABStateInput,
	type HeadlessIABVendorId,
	type ProcessedFeature,
	type ProcessedGVLData,
	type ProcessedPurpose,
	type ProcessedSpecialFeature,
	type ProcessedStack,
	type ProcessedVendor,
	processGVLForDialog,
	resolveIABBannerSummary,
} from './headless';
/**
 * Convenience re-exports so consumers writing custom IAB flows don't
 * need to thread through `@c15t/iab`'s internal subpaths.
 */
export {
	c15tConsentsToIabPurposes,
	clearGVLCache,
	fetchGVL,
	iabPurposesToC15tConsents,
};
