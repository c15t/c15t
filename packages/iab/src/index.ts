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

import {
	clearAuthorityReceipt,
	createAuthorityReceipt,
	readAuthorityReceipt,
	storeAuthority,
	validateAuthority,
} from './authority';
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
	const vendorConsents: Record<string, boolean> = Object.fromEntries(
		vendors.map((vendor) => [
			String(vendor.id),
			value && vendor.purposes.length > 0,
		])
	);
	const vendorLegitimateInterests: Record<string, boolean> = Object.fromEntries(
		vendors.map((vendor) => [
			String(vendor.id),
			value && (vendor.legIntPurposes?.length ?? 0) > 0,
		])
	);
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
};

const sameConfirmationContext = function sameConfirmationContext(
	left: ConsentSnapshot,
	right: ConsentSnapshot
): boolean {
	return (
		left.evaluationPolicy.choice.fingerprint ===
			right.evaluationPolicy.choice.fingerprint &&
		left.iab === right.iab &&
		left.subject === right.subject &&
		left.user === right.user &&
		left.explicitChoice === right.explicitChoice
	);
};

const changedIABDraft = function changedIABDraft(
	previous: ConsentSnapshot,
	current: ConsentSnapshot
): boolean {
	return (
		current.iab !== previous.iab &&
		current.iab?.gvl === previous.iab?.gvl &&
		current.iab?.enabled === previous.iab?.enabled &&
		!current.iab?.authority
	);
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
	let authorityTimer: ReturnType<typeof setTimeout> | undefined;
	let confirmationGeneration = 0;
	const armAuthorityTimer = function armAuthorityTimer(): void {
		clearTimeout(authorityTimer);
		const authority = kernel.getSnapshot().iab?.authority;
		if (!authority || disposed) {
			return;
		}
		const remaining = authority.expiresAt - Date.now();
		if (remaining <= 0) {
			kernel.set.iab({ authority: null });
			return;
		}
		authorityTimer = setTimeout(
			armAuthorityTimer,
			Math.min(remaining, 2_147_483_647)
		);
	};

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

	let restoredFingerprint: string | null = null;
	let hydrationCancelled = false;
	const restoreAuthority = async function restoreAuthority(): Promise<void> {
		if (options.persistence === false) {
			return;
		}
		const hydrationSnapshot = kernel.getSnapshot();
		const recordsGeneration = kernel.getRecordsGeneration();
		if (
			disposed ||
			hydrationCancelled ||
			hydrationSnapshot.iab?.authority ||
			!hydrationSnapshot.iab?.gvl ||
			hydrationSnapshot.model !== 'iab' ||
			hydrationSnapshot.resolution.status !== 'matched'
		) {
			return;
		}
		const { fingerprint } = hydrationSnapshot.evaluationPolicy.choice;
		if (restoredFingerprint === fingerprint) {
			return;
		}
		restoredFingerprint = fingerprint;
		const generation = confirmationGeneration;
		const authority = await validateAuthority(
			readAuthorityReceipt(),
			hydrationSnapshot,
			Date.now()
		);
		const current = kernel.getSnapshot();
		if (
			!disposed &&
			!hydrationCancelled &&
			authority &&
			generation === confirmationGeneration &&
			kernel.getRecordsGeneration() === recordsGeneration &&
			current.iab === hydrationSnapshot.iab &&
			current.explicitChoice === hydrationSnapshot.explicitChoice &&
			current.subject === hydrationSnapshot.subject &&
			current.evaluationPolicy.choice.fingerprint === fingerprint
		) {
			kernel.set.iab({ authority, tcString: authority.tcString });
			armAuthorityTimer();
		}
	};
	const unsubscribeClear = kernel.events.on('records:cleared', () => {
		hydrationCancelled = true;
		confirmationGeneration += 1;
		clearAuthorityReceipt();
	});
	const initializationSnapshot = kernel.getSnapshot();
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
		const mayHydrate = kernel.getSnapshot().iab === initializationSnapshot.iab;
		kernel.set.iab({ enabled: true, gvl });
		try {
			cmpApi = createCMPApi({ cmpId, cmpVersion, gvl });
			if (mayHydrate) {
				void restoreAuthority();
			}
		} catch {
			// Failing to install CMP API is non-fatal; kernel state is
			// still correct, the rest of the module just can't respond
			// to __tcfapi queries yet.
		}
	})();

	// Keep the CMP API state in sync with snapshot changes. v2 calls
	// `cmpApi.updateConsent(tcString)` on save — we mirror that here.
	let previousAuthority = kernel.getSnapshot().iab?.authority;
	let previousSnapshot = kernel.getSnapshot();
	const unsubscribe = kernel.subscribe((snapshot: ConsentSnapshot) => {
		const policyChanged = snapshot.resolution !== previousSnapshot.resolution;
		if (!policyChanged && changedIABDraft(previousSnapshot, snapshot)) {
			hydrationCancelled = true;
		}
		previousSnapshot = snapshot;
		if (policyChanged) {
			queueMicrotask(() => {
				void restoreAuthority();
			});
		}
		if (previousAuthority && !snapshot.iab?.authority) {
			clearAuthorityReceipt();
		}
		previousAuthority = snapshot.iab?.authority;
		armAuthorityTimer();
		if (!cmpApi) {
			return;
		}
		const tcString = snapshot.iab?.authority?.tcString ?? null;
		cmpApi.updateConsent(tcString ?? '');
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
			purposeConsents: { ...iab.purposeConsents },
			purposeLegitimateInterests: { ...iab.purposeLegitimateInterests },
			specialFeatureOptIns: { ...iab.specialFeatureOptIns },
			vendorConsents: { ...vendorConsents },
			vendorLegitimateInterests: { ...vendorLegitimateInterests },
			vendorsDisclosed: disclosed,
		};
	};

	const generateTC = async function generateTC(): Promise<string> {
		const snapshot = kernel.getSnapshot();
		const recordsGeneration = kernel.getRecordsGeneration();
		const generation = confirmationGeneration;
		const iab = readIAB(kernel);
		if (!iab.gvl) {
			throw new Error(
				'createIAB: cannot generate TC string — GVL not loaded yet.'
			);
		}
		// Lazy-load @iabtechlabtcf/core only when we actually encode.
		const consentData = buildTCFConsentData();
		await getTCFCore();
		const tcString = await generateTCString(consentData, iab.gvl, {
			cmpId,
			cmpVersion,
			isServiceSpecific: options.isServiceSpecific ?? true,
			publisherCountryCode: options.publisherCountryCode ?? 'US',
		});
		if (
			!disposed &&
			generation === confirmationGeneration &&
			kernel.getRecordsGeneration() === recordsGeneration &&
			sameConfirmationContext(kernel.getSnapshot(), snapshot)
		) {
			kernel.set.iab({ tcString });
		}
		return tcString;
	};

	// Registration needs the completed handle; dispose runs after registration.
	// oxlint-disable-next-line prefer-const -- Assigned after the handle closes over this teardown.
	let unregisterControls: (() => void) | undefined;
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
			clearTimeout(authorityTimer);
			unregisterControls?.();
			unsubscribe();
			unsubscribeClear();
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
			const actionAt = Date.now();
			confirmationGeneration += 1;
			const generation = confirmationGeneration;
			const snapshot = kernel.getSnapshot();
			const recordsGeneration = kernel.getRecordsGeneration();
			if (!snapshot.iab?.gvl) {
				return;
			}
			const consentData = buildTCFConsentData();
			const receipt = createAuthorityReceipt(snapshot, '', actionAt);
			const tcString = await generateTCString(consentData, snapshot.iab.gvl, {
				cmpId,
				cmpVersion,
				confirmedAt: actionAt,
				isServiceSpecific: options.isServiceSpecific ?? true,
				publisherCountryCode: options.publisherCountryCode ?? 'US',
			});
			const authority = await validateAuthority(
				{ ...receipt, tcString },
				snapshot,
				Date.now()
			);
			if (
				!authority ||
				disposed ||
				generation !== confirmationGeneration ||
				kernel.getRecordsGeneration() !== recordsGeneration ||
				!sameConfirmationContext(kernel.getSnapshot(), snapshot)
			) {
				return;
			}
			const consents = iabPurposesToC15tConsents(consentData.purposeConsents);
			const pendingSave = kernel.commands.save(consents, {
				actionAt,
				iabAuthority: authority,
			});
			// Save commits locally before its first yield. Transport acknowledgement
			// cannot revoke that action or assign authority to a later action.
			if (
				kernel.getSnapshot().iab?.authority?.tcString === tcString &&
				!disposed &&
				generation === confirmationGeneration &&
				kernel.getRecordsGeneration() === recordsGeneration
			) {
				if (options.persistence !== false) {
					storeAuthority(authority);
					cmpApi?.saveToStorage(tcString);
				}
				cmpApi?.updateConsent(tcString, consentData);
				armAuthorityTimer();
			}
			const result = await pendingSave;
			if (!result.ok) {
				throw new Error('Unable to save IAB preferences.');
			}
		},
		setPurposeConsent(id, value) {
			const current = readIAB(kernel).purposeConsents;
			if (current[id] === value) {
				return;
			}
			const next = { ...current, [id]: value };
			kernel.set.iab({ purposeConsents: next });
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
	unregisterControls = registerIABControls(kernel, handle);
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
