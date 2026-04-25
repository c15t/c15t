/**
 * @c15t/iab/v3 — IAB TCF 2.3 module for the v3 kernel.
 *
 * Consumes the c15t/v3 kernel and provides CMP-compliant IAB TCF
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

import type { CMPApi } from 'c15t';
import type { ConsentKernel, GlobalVendorList, NonIABVendor } from 'c15t/v3';
import { createCMPApi } from '../tcf/cmp-api';
import { clearGVLCache, fetchGVL } from '../tcf/fetch-gvl';
import { getTCFCore } from '../tcf/lazy-load';
import {
	c15tConsentsToIabPurposes,
	iabPurposesToC15tConsents,
} from '../tcf/purpose-mapping';
import { destroyIABStub as destroyStub, initializeIABStub } from '../tcf/stub';
import { generateTCString } from '../tcf/tc-string';

/**
 * Public option surface for `createIAB`. Mirrors v2's `IABUserConfig`
 * but threads the kernel through.
 */
export interface CreateIABOptions {
	/** The v3 kernel to bind to. */
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
 * Handle returned by `createIAB`. Provides imperative control over the
 * CMP state and a `dispose` method for teardown.
 */
export interface IABHandle {
	/** Tear down the CMP API + stub and disconnect kernel subscriptions. */
	dispose(): void;
	/** The underlying CMP API instance (for advanced consumers). */
	cmpApi: CMPApi | null;
	/** Set consent for a specific IAB vendor by ID. */
	setVendorConsent(vendorId: string | number, value: boolean): void;
	/** Set legitimate interest for a specific IAB vendor. */
	setVendorLegitimateInterest(vendorId: string | number, value: boolean): void;
	/** Set consent for a specific IAB purpose (1–11). */
	setPurposeConsent(purposeId: number, value: boolean): void;
	/** Set legitimate interest for a specific IAB purpose. */
	setPurposeLegitimateInterest(purposeId: number, value: boolean): void;
	/** Opt in/out of a special feature (1 = geo, 2 = device ID). */
	setSpecialFeatureOptIn(featureId: number, value: boolean): void;
	/** Flip every vendor + purpose consent to true. */
	acceptAll(): void;
	/** Flip every vendor + purpose consent to false. */
	rejectAll(): void;
	/**
	 * Encode the current state as a TCF 2.3 string and commit to the
	 * kernel (via `set.iab({ tcString })`). Does NOT call
	 * `kernel.commands.save()` — the caller decides whether to persist
	 * or just emit the string.
	 */
	generateTCString(): Promise<string>;
	/**
	 * Generate the TC string, commit it to the kernel, and call
	 * `kernel.commands.save()` — the full save flow including backend
	 * round-trip (if a transport is configured).
	 */
	save(): Promise<void>;
}

/**
 * Internal helper — synchronously seed the IAB snapshot with baseline
 * state so selectors have something to read immediately on mount.
 */
function seedInitialIAB(
	kernel: ConsentKernel,
	options: CreateIABOptions,
	gvl: GlobalVendorList | null
): void {
	kernel.set.iab({
		enabled: gvl !== null,
		gvl,
		customVendors: options.customVendors ?? [],
		cmpId: options.cmpId,
	});
}

/**
 * Pull the current IAB slice from the kernel snapshot, returning a
 * default-populated object when the slice hasn't been initialized yet.
 */
function readIAB(kernel: ConsentKernel) {
	return (
		kernel.getSnapshot().iab ?? {
			enabled: false,
			gvl: null as GlobalVendorList | null,
			customVendors: [] as NonIABVendor[],
			cmpId: null as number | null,
			vendorConsents: {} as Record<string, boolean>,
			vendorLegitimateInterests: {} as Record<string, boolean>,
			purposeConsents: {} as Record<number, boolean>,
			purposeLegitimateInterests: {} as Record<number, boolean>,
			specialFeatureOptIns: {} as Record<number, boolean>,
			tcString: null as string | null,
		}
	);
}

/**
 * Flip every vendor / purpose / legit-interest / special-feature to the
 * same value. Used by acceptAll / rejectAll.
 */
function applyBlanket(
	kernel: ConsentKernel,
	gvl: GlobalVendorList,
	value: boolean
): void {
	const vendorIds = Object.keys(gvl.vendors ?? {});
	const purposeIds = Object.keys(gvl.purposes ?? {}).map(Number);
	const specialFeatureIds = Object.keys(gvl.specialFeatures ?? {}).map(Number);

	const vendorConsents: Record<string, boolean> = {};
	const vendorLegitimateInterests: Record<string, boolean> = {};
	for (const id of vendorIds) {
		vendorConsents[id] = value;
		vendorLegitimateInterests[id] = value;
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
		vendorConsents,
		vendorLegitimateInterests,
		purposeConsents,
		purposeLegitimateInterests,
		specialFeatureOptIns,
	});

	// Also map purposes → c15t categories so the top-level consent record
	// reflects the IAB choices.
	if (value) {
		const consents = iabPurposesToC15tConsents(purposeConsents);
		kernel.set.consent(consents);
	} else {
		kernel.set.consent({
			functionality: false,
			marketing: false,
			measurement: false,
			experience: false,
		});
	}
}

export function createIAB(options: CreateIABOptions): IABHandle {
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
		preloadedGvl !== undefined
			? Promise.resolve(preloadedGvl)
			: (async () => {
					try {
						return await fetchGVL(vendors, { endpoint: gvlURL });
					} catch {
						return null;
					}
				})();

	gvlPromise.then((gvl) => {
		if (disposed) return;
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
	});

	// Keep the CMP API state in sync with snapshot changes. v2 calls
	// `cmpApi.updateConsent(tcString)` on save — we mirror that here.
	const unsubscribe = kernel.subscribe((snapshot) => {
		if (!cmpApi) return;
		const tcString = snapshot.iab?.tcString ?? null;
		if (tcString) cmpApi.updateConsent(tcString);
	});

	async function generateTC(): Promise<string> {
		const iab = readIAB(kernel);
		if (!iab.gvl) {
			throw new Error(
				'createIAB: cannot generate TC string — GVL not loaded yet.'
			);
		}
		// Lazy-load @iabtechlabtcf/core only when we actually encode.
		await getTCFCore();
		// `vendorsDisclosed` should reflect every vendor the CMP made
		// available to the user, per TCF 2.3. For MVP we mirror the set
		// of vendors whose consent has been considered.
		const disclosed: Record<string, boolean> = {};
		for (const id of Object.keys(iab.vendorConsents)) disclosed[id] = true;
		for (const id of Object.keys(iab.vendorLegitimateInterests)) {
			disclosed[id] = true;
		}
		const tcString = await generateTCString(
			{
				vendorConsents: iab.vendorConsents,
				vendorLegitimateInterests: iab.vendorLegitimateInterests,
				purposeConsents: iab.purposeConsents,
				purposeLegitimateInterests: iab.purposeLegitimateInterests,
				specialFeatureOptIns: iab.specialFeatureOptIns,
				vendorsDisclosed: disclosed,
			},
			iab.gvl,
			{
				cmpId,
				cmpVersion,
				publisherCountryCode: options.publisherCountryCode ?? 'US',
				isServiceSpecific: options.isServiceSpecific ?? true,
			}
		);
		kernel.set.iab({ tcString });
		return tcString;
	}

	return {
		cmpApi,
		dispose() {
			disposed = true;
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
		setVendorConsent(id, value) {
			const key = String(id);
			const current = readIAB(kernel).vendorConsents;
			if (current[key] === value) return;
			kernel.set.iab({
				vendorConsents: { ...current, [key]: value },
			});
		},
		setVendorLegitimateInterest(id, value) {
			const key = String(id);
			const current = readIAB(kernel).vendorLegitimateInterests;
			if (current[key] === value) return;
			kernel.set.iab({
				vendorLegitimateInterests: { ...current, [key]: value },
			});
		},
		setPurposeConsent(id, value) {
			const current = readIAB(kernel).purposeConsents;
			if (current[id] === value) return;
			const next = { ...current, [id]: value };
			kernel.set.iab({ purposeConsents: next });
			// Also propagate to c15t categories so scripts/blockers see
			// the change.
			kernel.set.consent(iabPurposesToC15tConsents(next));
		},
		setPurposeLegitimateInterest(id, value) {
			const current = readIAB(kernel).purposeLegitimateInterests;
			if (current[id] === value) return;
			kernel.set.iab({
				purposeLegitimateInterests: { ...current, [id]: value },
			});
		},
		setSpecialFeatureOptIn(id, value) {
			const current = readIAB(kernel).specialFeatureOptIns;
			if (current[id] === value) return;
			kernel.set.iab({
				specialFeatureOptIns: { ...current, [id]: value },
			});
		},
		acceptAll() {
			const gvl = readIAB(kernel).gvl;
			if (!gvl) return;
			applyBlanket(kernel, gvl, true);
		},
		rejectAll() {
			const gvl = readIAB(kernel).gvl;
			if (!gvl) return;
			applyBlanket(kernel, gvl, false);
		},
		generateTCString: generateTC,
		async save() {
			await generateTC();
			// Map purposes → c15t consents one more time to make sure
			// the final save payload reflects what we just generated.
			const purposes = readIAB(kernel).purposeConsents;
			const consents = iabPurposesToC15tConsents(purposes);
			await kernel.commands.save(consents);
		},
	};
}

export type { CMPApi } from 'c15t';
export type { GlobalVendorList, NonIABVendor } from 'c15t/v3';
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
