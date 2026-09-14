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
import { clearGVLCache, fetchGVL, narrowGVLToVendors } from './tcf/fetch-gvl';
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
	 * Override the GVL endpoint. Default: `gvl.inth.app`.
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
export { initializeIABStub, destroyIABStub } from './tcf/stub';

/**
 * Handle returned by `createIAB`. Provides imperative control over the
 * CMP state and a `dispose` method for teardown.
 */
export interface IABHandle {
	/** Wait for GVL loading and CMP setup. Rejects if setup could not complete. */
	whenReady: () => Promise<void>;
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
	let reference =
		options.gvl === undefined
			? kernel.getSnapshot().iab?.gvlReference
			: undefined;
	if (reference && options.vendors?.length) {
		reference = { ...reference, summary: undefined };
	}
	kernel.set.iab({
		cmpId: options.cmpId,
		customVendors:
			options.customVendors ?? kernel.getSnapshot().iab?.customVendors ?? [],
		enabled:
			gvl !== null ||
			(options.gvl === undefined &&
				Boolean(kernel.getSnapshot().iab?.gvlReference)),
		gvl,
		gvlReference: reference,
	});
};

/**
 * Pull the current IAB slice from the kernel snapshot, returning a
 * default-populated object when the slice hasn't been initialized yet.
 */
const readIAB = function readIAB(kernel: ConsentKernel) {
	return (
		kernel.getSnapshot().iab ?? {
			authority: null,
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
		current.iab?.gvlReference === previous.iab?.gvlReference &&
		!current.iab?.authority
	);
};

const changedSelections = (
	previous: ConsentSnapshot,
	current: ConsentSnapshot
): boolean =>
	current.iab?.purposeConsents !== previous.iab?.purposeConsents ||
	current.iab?.purposeLegitimateInterests !==
		previous.iab?.purposeLegitimateInterests ||
	current.iab?.vendorConsents !== previous.iab?.vendorConsents ||
	current.iab?.vendorLegitimateInterests !==
		previous.iab?.vendorLegitimateInterests ||
	current.iab?.specialFeatureOptIns !== previous.iab?.specialFeatureOptIns;

const changedReference = (
	previous: ConsentSnapshot['iab'],
	current: ConsentSnapshot['iab']
): boolean => {
	const before = previous?.gvlReference;
	const after = current?.gvlReference;
	return Boolean(
		after &&
		(!before ||
			after.url !== before.url ||
			after.language !== before.language ||
			after.vendorListVersion !== before.vendorListVersion ||
			after.format !== before.format ||
			after.context?.country !== before.context?.country ||
			after.context?.region !== before.context?.region ||
			after.context?.gpc !== before.context?.gpc)
	);
};

const referenceHeaders = (
	requested: NonNullable<ConsentSnapshot['iab']>['gvlReference']
): Record<string, string> | undefined => {
	if (!requested) {
		return undefined;
	}
	const headers: Record<string, string> = {
		'accept-language': requested.language,
	};
	if (requested.format === 'init') {
		if (requested.context?.country) {
			headers['x-c15t-country'] = requested.context.country;
		}
		if (requested.context?.region) {
			headers['x-c15t-region'] = requested.context.region;
		}
		if (requested.context?.gpc !== undefined) {
			headers['x-c15t-gpc'] = requested.context.gpc ? '1' : '0';
		}
	}
	return headers;
};

const cmpDisplayStatus = (snapshot: ConsentSnapshot): 'visible' | 'hidden' =>
	snapshot.policyRule.model === 'iab' &&
	(snapshot.activeUI === 'banner' || snapshot.activeUI === 'dialog')
		? 'visible'
		: 'hidden';

/**
 * The vendor list `createIAB` starts from, before any network fetch.
 *
 * - An explicit `gvl` option wins, `null` included.
 * - A list already in the kernel (server-resolved state from
 *   `resolveConsent()` or a framework init route) is reused, narrowed to
 *   the `vendors` allowlist the GVL endpoint would otherwise have applied.
 *   Reseeding from an absent option would wipe it, flip `enabled` to
 *   false, and pay for a second fetch.
 * - A server that resolved this request without a vendor list for a
 *   policy that is not IAB said "no IAB here"; keep that `null` instead of
 *   fetching a list nothing will render. For an IAB policy the missing
 *   list is a server-side failure, so fall through and fetch.
 * - Otherwise `undefined`: fetch.
 */
const resolvePreloadedGvl = function resolvePreloadedGvl(
	kernel: ConsentKernel,
	options: CreateIABOptions
): GlobalVendorList | null | undefined {
	if (options.gvl !== undefined) {
		return options.gvl;
	}
	const snapshot = kernel.getSnapshot();
	const held = snapshot.iab?.gvl;
	if (held) {
		return options.vendors?.length
			? narrowGVLToVendors(held, options.vendors)
			: held;
	}
	const prepared = kernel.getServerSnapshot().iab;
	if (
		prepared &&
		prepared.gvl === null &&
		snapshot.policyRule.model !== 'iab'
	) {
		return null;
	}
	return undefined;
};

export const createIAB = function createIAB(
	options: CreateIABOptions
): IABHandle {
	const { kernel, cmpId, cmpVersion = 1, vendors, gvlURL } = options;

	const preloadedGvl = resolvePreloadedGvl(kernel, options);
	let reference =
		options.gvl === undefined
			? kernel.getSnapshot().iab?.gvlReference
			: undefined;

	// Seed the iab slice immediately so downstream consumers see the
	// cmpId and any preloaded GVL. A reference keeps the server-rendered
	// banner enabled while its list loads.
	seedInitialIAB(kernel, options, preloadedGvl ?? null);

	let cmpApi: CMPApi | null = null;
	let disposed = false;
	let authorityTimer: ReturnType<typeof setTimeout> | undefined;
	let confirmationGeneration = 0;
	let selectionRevision = 0;
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

	// Fetch outside the page payload. Start on mount so CMP readiness and
	// returning-visitor validation do not depend on a banner interaction.
	const loadList = async (
		preloaded: GlobalVendorList | null | undefined,
		requested: typeof reference
	): Promise<GlobalVendorList | null> => {
		if (preloaded !== undefined) {
			return preloaded;
		}

		const list = await fetchGVL(requested ? undefined : vendors, {
			endpoint: requested?.url ?? gvlURL,
			format: requested?.format,
			headers: referenceHeaders(requested),
		});
		if (
			requested &&
			(!list || list.vendorListVersion !== requested.vendorListVersion)
		) {
			throw new Error(
				'The IAB vendor list changed. Reload to review the current list.'
			);
		}
		return list && vendors?.length ? narrowGVLToVendors(list, vendors) : list;
	};

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
	let listGeneration = 0;
	let publishedList = preloadedGvl ?? null;
	let initializationError: unknown;
	const retainedAuthorityMatchesList = async (
		snapshot: ConsentSnapshot,
		gvl: GlobalVendorList
	): Promise<boolean> => {
		const { iab } = snapshot;
		const retained = iab?.authority;
		if (!retained || !iab) {
			return true;
		}
		return Boolean(
			await validateAuthority(
				{
					...retained,
					customConsents: retained.vendorConsents,
					customLegitimateInterests: retained.vendorLegitimateInterests,
				},
				{ ...snapshot, iab: { ...iab, gvl } },
				Date.now()
			)
		);
	};
	const initialize = async (
		preloaded: GlobalVendorList | null | undefined,
		requested: typeof reference
	) => {
		listGeneration += 1;
		const generation = listGeneration;
		const initializationSnapshot = kernel.getSnapshot();
		initializationError = undefined;
		cmpApi?.updateVendorList(null);
		try {
			const gvl = await loadList(preloaded, requested);
			if (disposed || generation !== listGeneration) {
				return;
			}
			if (gvl === null) {
				kernel.set.iab({ enabled: false, gvl: null });
				return;
			}
			const beforePublish = kernel.getSnapshot();
			const retained = beforePublish.iab?.authority;
			const validAuthority = await retainedAuthorityMatchesList(
				beforePublish,
				gvl
			);
			if (disposed || generation !== listGeneration) {
				return;
			}
			const mayHydrate =
				kernel.getSnapshot().iab === initializationSnapshot.iab;
			const update: Parameters<typeof kernel.set.iab>[0] = {
				enabled: true,
				gvl,
				gvlReference: undefined,
			};
			if (!validAuthority && readIAB(kernel).authority === retained) {
				update.authority = null;
				update.tcString = '';
			}
			const existingApi = cmpApi;
			existingApi?.updateVendorList(gvl);
			publishedList = gvl;
			kernel.set.iab(update);
			try {
				cmpApi ??= createCMPApi({
					cmpId,
					cmpVersion,
					gdprApplies: kernel.getSnapshot().policyRule.model === 'iab',
					gvl,
				});
				const current = kernel.getSnapshot();
				if (existingApi) {
					existingApi.updateConsent(
						current.iab?.authority?.tcString ?? '',
						undefined,
						current.policyRule.model === 'iab'
					);
				}
				cmpApi.setDisplayStatus(cmpDisplayStatus(current));
				if (mayHydrate) {
					void restoreAuthority();
				}
			} catch {
				// Kernel metadata remains available if installing the CMP API fails.
			}
		} catch (error) {
			if (generation === listGeneration) {
				initializationError = error;
			}
		}
	};
	let initialization = initialize(preloadedGvl, reference);
	let notifyReplacement!: () => void;
	let replaced = new Promise<void>((resolve) => {
		notifyReplacement = resolve;
	});

	const whenReady = async (): Promise<void> => {
		// A later user action retries a failed request; concurrent callers share it.
		if (initializationError && !disposed) {
			initialization = initialize(undefined, reference);
		}
		let pending: Promise<void>;
		do {
			pending = initialization;
			// A replacement can finish before an obsolete request ever responds.
			// oxlint-disable-next-line no-await-in-loop -- Each iteration follows a new initialization generation.
			await Promise.race([pending, replaced]);
		} while (pending !== initialization);
		if (initializationError) {
			throw new Error(
				`Unable to load IAB privacy settings: ${initializationError instanceof Error ? initializationError.message : 'vendor list request failed'}`,
				{ cause: initializationError }
			);
		}
		// An explicit null, from the option or the server state, is a
		// decision, not a failed load.
		if (!disposed && preloadedGvl !== null && !cmpApi) {
			throw new Error('Unable to load IAB privacy settings.');
		}
	};

	const waitForReferencedList = async (): Promise<boolean> => {
		const before = kernel.getSnapshot();
		const records = kernel.getRecordsGeneration();
		const generation = confirmationGeneration;
		await whenReady();
		const current = kernel.getSnapshot();
		return (
			!disposed &&
			records === kernel.getRecordsGeneration() &&
			generation === confirmationGeneration &&
			current.resolution === before.resolution &&
			current.user === before.user &&
			current.subject === before.subject
		);
	};
	const queueBlanket = async (value: boolean): Promise<void> => {
		selectionRevision += 1;
		const revision = selectionRevision;
		try {
			if ((await waitForReferencedList()) && revision === selectionRevision) {
				const { gvl } = readIAB(kernel);
				if (gvl) {
					applyBlanket(kernel, gvl, value);
				}
			}
		} catch {
			// save()/whenReady() reports a failed load; no selection is applied.
		}
	};

	// oxlint-disable-next-line complexity -- Keep replacement, cancellation and allowlist handling in one lifecycle transition.
	const syncList = (previous: ConsentSnapshot, snapshot: ConsentSnapshot) => {
		if (options.gvl !== undefined) {
			return;
		}
		let inline = snapshot.iab?.gvl ?? undefined;
		const inlineChanged = inline && inline !== publishedList;
		const removed =
			previous.iab?.gvlReference && !snapshot.iab?.gvlReference && !inline;
		if (
			!(
				changedReference(previous.iab, snapshot.iab) ||
				inlineChanged ||
				removed
			)
		) {
			return;
		}
		reference = snapshot.iab?.gvlReference;
		if (reference?.summary && vendors?.length) {
			reference = { ...reference, summary: undefined };
			kernel.set.iab({ gvlReference: reference });
		}
		publishedList = inline ?? null;
		confirmationGeneration += 1;
		restoredFingerprint = null;
		const notify = notifyReplacement;
		replaced = new Promise<void>((resolve) => {
			notifyReplacement = resolve;
		});
		if (inline && vendors?.length) {
			inline = narrowGVLToVendors(inline, vendors);
		}
		if (removed) {
			listGeneration += 1;
			initializationError = undefined;
			cmpApi?.updateVendorList(null);
			initialization = Promise.resolve();
		} else {
			initialization = initialize(inline, reference);
		}
		notify();
	};

	// Keep the CMP API state in sync with snapshot changes. v2 calls
	// `cmpApi.updateConsent(tcString)` on save — we mirror that here.
	let previousAuthority = kernel.getSnapshot().iab?.authority;
	let previousDisplay = cmpDisplayStatus(kernel.getSnapshot());
	let previousSnapshot = kernel.getSnapshot();
	const unsubscribe = kernel.subscribe((snapshot: ConsentSnapshot) => {
		const previous = previousSnapshot;
		previousSnapshot = snapshot;
		if (changedSelections(previous, snapshot)) {
			selectionRevision += 1;
		}
		syncList(previous, snapshot);

		const policyChanged = snapshot.resolution !== previous.resolution;
		if (!policyChanged && changedIABDraft(previous, snapshot)) {
			hydrationCancelled = true;
		}
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
		// Expiry can synchronously publish a newer snapshot while arming the
		// timer. Never restore the expired receipt from this notification.
		const tcString = kernel.getSnapshot().iab?.authority?.tcString ?? null;
		cmpApi.updateConsent(
			tcString ?? '',
			undefined,
			snapshot.policyRule.model === 'iab'
		);
		const nextDisplay = cmpDisplayStatus(snapshot);
		if (nextDisplay !== previousDisplay) {
			previousDisplay = nextDisplay;
			cmpApi.setDisplayStatus(nextDisplay);
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
			purposeConsents: { ...iab.purposeConsents },
			purposeLegitimateInterests: { ...iab.purposeLegitimateInterests },
			specialFeatureOptIns: { ...iab.specialFeatureOptIns },
			vendorConsents: { ...vendorConsents },
			vendorLegitimateInterests: { ...vendorLegitimateInterests },
			vendorsDisclosed: disclosed,
		};
	};

	const generateTC = async function generateTC(): Promise<string> {
		if (!readIAB(kernel).gvl && reference && !(await waitForReferencedList())) {
			throw new Error('IAB action cancelled while loading vendor data.');
		}
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
			if (!readIAB(kernel).gvl && reference) {
				void queueBlanket(true);
				return;
			}
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
			if (!readIAB(kernel).gvl && reference) {
				void queueBlanket(false);
				return;
			}
			const { gvl } = readIAB(kernel);
			if (!gvl) {
				return;
			}
			applyBlanket(kernel, gvl, false);
		},
		// oxlint-disable-next-line complexity -- Keep the async save cancellation checks together.
		async save() {
			if (
				!readIAB(kernel).gvl &&
				reference &&
				!(await waitForReferencedList())
			) {
				throw new Error('IAB action cancelled while loading vendor data.');
			}
			if (disposed) {
				return;
			}
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
			const scope = new Set<string>(snapshot.policyRule.scope);
			// Refusals must replace old grants even after a category leaves scope.
			const consentPatch = Object.fromEntries(
				Object.entries(consents).filter(
					([category, granted]) => !granted || scope.has(category)
				)
			);
			const pendingSave = kernel.commands.save(consentPatch, {
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
		whenReady,
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
