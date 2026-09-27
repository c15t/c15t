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
	ExplicitChoice,
	GlobalVendorList,
	KernelIABAuthority,
	KernelIABState,
	NonIABVendor,
} from '@c15t/core';

import {
	AUTHORITY_KEY,
	checkAuthority,
	clearAuthorityReceipt,
	createAuthorityReceipt,
	readAuthorityReceipt,
	readAuthorityReceiptText,
	storeAuthority,
	validateAuthority,
} from './authority';
import { applyPublisherRestrictionsToGVL } from './headless/effective-vendor-list';
import { createCMPApi } from './tcf/cmp-api';
import { clearGVLCache, fetchGVL, narrowGVLToVendors } from './tcf/fetch-gvl';
import type { PublisherRestriction } from './tcf/iab-tcf-types';
import { getTCFCore } from './tcf/lazy-load';
import {
	copyPublisherRestrictionInput,
	PublisherRestrictionError,
	validatePublisherRestrictions,
} from './tcf/publisher-restrictions';
import {
	C15T_TO_IAB_PURPOSE_MAP,
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
	/**
	 * Publisher restrictions encoded into every TC string this CMP saves and
	 * applied when c15t gates IAB scripts. Checked against the vendor list
	 * once it loads: an unsupported restriction rejects `whenReady()`,
	 * `generateTCString()` and `save()` with a `PublisherRestrictionError`.
	 * `whenReady()` does not retry it. With an explicit `gvl` it lasts for the
	 * handle; otherwise a replacement vendor list is checked again.
	 * The array is copied when the handle is created.
	 */
	publisherRestrictions?: PublisherRestriction[];
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
export type { PublisherRestriction } from './tcf/iab-tcf-types';
export {
	CONSENT_ONLY_PURPOSES,
	PUBLISHER_RESTRICTION_TYPES,
	PublisherRestrictionError,
	validatePublisherRestrictions,
} from './tcf/publisher-restrictions';
export type { PublisherRestrictionContext } from './tcf/publisher-restrictions';

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
	gvl: GlobalVendorList | null,
	publisherRestrictions: PublisherRestriction[]
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
		publisherRestrictions,
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
	value: boolean,
	restrictions: readonly PublisherRestriction[] = []
): void {
	// A restriction can move a vendor's flexible purpose to the other legal
	// basis, so that basis needs the vendor signal instead.
	const vendors = [
		...Object.values(
			applyPublisherRestrictionsToGVL(gvl, restrictions).vendors ?? {}
		),
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

/**
 * Restrictions preference UIs read from the kernel before the vendor list
 * is known. Invalid input shows none: the CMP rejects it before saving.
 */
const restrictionsForDisplay = function restrictionsForDisplay(
	input: unknown,
	isServiceSpecific: boolean
): PublisherRestriction[] {
	try {
		return validatePublisherRestrictions(input, { isServiceSpecific });
	} catch {
		return [];
	}
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

/**
 * Whether a TC authority grants something the explicit choice denies.
 *
 * A denial recorded after the authority was confirmed denies every purpose
 * of its category: any one of them granted is a conflict. A denial from the
 * same IAB save (or an older one) is how that save summarised a partial
 * selection, since a category counts as granted only when all its purposes
 * are; there only a TC string granting every purpose of the category
 * conflicts, so the visitor's own partial selection stands.
 *
 * Only purpose consent counts. A category refusal withholds consent; the
 * TCF control for legitimate interest is the objection, which the
 * legitimate interest bits record, so a refused category does not revoke
 * them. Counting them would also make the usual save that refuses consent
 * without objecting conflict with itself. A later denial still withdraws
 * an authority granting only legitimate interest once its receipt is
 * reloaded, since the authority then predates the choice (see
 * {@link predatesChoice}).
 */
const grantsDeniedCategory = function grantsDeniedCategory(
	authority: KernelIABAuthority,
	choice: ExplicitChoice | null
): boolean {
	if (!choice) {
		return false;
	}
	return Object.entries(choice.categories).some(([category, decision]) => {
		if (decision?.value !== false) {
			return false;
		}
		const purposes =
			C15T_TO_IAB_PURPOSE_MAP[category as keyof typeof C15T_TO_IAB_PURPOSE_MAP];
		const granted = (purpose: number) =>
			authority.purposeConsents[purpose] === true;
		return decision.confirmedAt > authority.confirmedAt
			? purposes.some(granted)
			: purposes.every(granted);
	});
};

/** The editable selections a confirmed authority records. */
const selectionsOf = function selectionsOf(authority: KernelIABAuthority) {
	return {
		purposeConsents: { ...authority.purposeConsents },
		purposeLegitimateInterests: { ...authority.purposeLegitimateInterests },
		specialFeatureOptIns: { ...authority.specialFeatureOptIns },
		vendorConsents: { ...authority.vendorConsents },
		vendorLegitimateInterests: { ...authority.vendorLegitimateInterests },
	};
};

/** Purpose consents with every purpose of a denied category turned off. */
const withoutDeniedPurposes = function withoutDeniedPurposes(
	purposeConsents: Record<number, boolean>,
	choice: ExplicitChoice
): Record<number, boolean> {
	const next = { ...purposeConsents };
	for (const [category, decision] of Object.entries(choice.categories)) {
		if (decision?.value !== false) {
			continue;
		}
		const purposes =
			C15T_TO_IAB_PURPOSE_MAP[category as keyof typeof C15T_TO_IAB_PURPOSE_MAP];
		for (const purpose of purposes ?? []) {
			next[purpose] = false;
		}
	}
	return next;
};

/**
 * Whether a TC authority no longer describes the choice: the choice holds a
 * category decision confirmed after the authority was. An IAB save stamps
 * its category decisions with the authority's confirmation time, so a
 * later decision came from another action, such as an IAB save on a sibling
 * subdomain whose receipt this origin's localStorage cannot read.
 */
const predatesChoice = function predatesChoice(
	authority: KernelIABAuthority,
	choice: ExplicitChoice | null
): boolean {
	return Object.values(choice?.categories ?? {}).some(
		(decision) =>
			decision !== undefined && decision.confirmedAt > authority.confirmedAt
	);
};

/** Whether an authority may be published for `choice`. */
const fitsChoice = function fitsChoice(
	authority: KernelIABAuthority,
	choice: ExplicitChoice | null
): boolean {
	return (
		!grantsDeniedCategory(authority, choice) &&
		!predatesChoice(authority, choice)
	);
};

/** Canonical text of a vendor selection map, independent of key order. */
const selectionText = function selectionText(
	map: Record<string, boolean>
): string {
	return JSON.stringify(
		Object.keys(map)
			.sort()
			.map((id) => [id, map[id]])
	);
};

/**
 * Whether two authorities record the same vendor selections. The TC string
 * holds the registered vendors; custom vendors live only in these maps.
 */
const sameVendorSelections = function sameVendorSelections(
	left: KernelIABAuthority,
	right: KernelIABAuthority
): boolean {
	return (
		selectionText(left.vendorConsents) ===
			selectionText(right.vendorConsents) &&
		selectionText(left.vendorLegitimateInterests) ===
			selectionText(right.vendorLegitimateInterests)
	);
};

/**
 * Whether a stored receipt should replace the held authority: it fits the
 * choice (see {@link fitsChoice}) and is strictly newer, or replaces a held
 * authority that no longer fits. The TC string alone is no identity: its
 * timestamps round to the UTC day and custom-vendor selections live only
 * in the receipt, so a later save can produce the same string. A newer
 * receipt with the same string is still installed, carrying its own
 * confirmation and expiry times and custom-vendor selections. An equal
 * time is settled by {@link settleTie}.
 */
const shouldInstallReceipt = function shouldInstallReceipt(
	receipt: KernelIABAuthority | null,
	held: KernelIABAuthority | null,
	heldUnfit: boolean,
	choice: ExplicitChoice
): receipt is KernelIABAuthority {
	if (!receipt || !fitsChoice(receipt, choice)) {
		return false;
	}
	if (held === null || heldUnfit) {
		return true;
	}
	return receipt.confirmedAt > held.confirmedAt;
};

const SELECTION_MAPS = [
	'purposeConsents',
	'purposeLegitimateInterests',
	'specialFeatureOptIns',
	'vendorConsents',
	'vendorLegitimateInterests',
] as const;

/** Whether `authority` grants anything `other` does not. */
const grantsBeyond = function grantsBeyond(
	authority: KernelIABAuthority,
	other: KernelIABAuthority
): boolean {
	return SELECTION_MAPS.some((name) => {
		const theirs = other[name] as Record<string, boolean>;
		return Object.entries(authority[name]).some(
			([id, granted]) => granted === true && theirs[id] !== true
		);
	});
};

/**
 * How to settle a stored receipt confirmed in the same millisecond as the
 * held authority but recording different selections: two saves that cannot
 * be ordered. The more restrictive one wins, so a same-millisecond write
 * never lifts a revocation. `store` keeps the held authority and writes it
 * back, so every tab converges on it; `withdraw` covers two receipts that
 * each grant something the other denies, where neither is safe to publish.
 */
const settleTie = function settleTie(
	receipt: KernelIABAuthority,
	held: KernelIABAuthority
): 'install' | 'store' | 'withdraw' {
	if (!grantsBeyond(receipt, held)) {
		return 'install';
	}
	return grantsBeyond(held, receipt) ? 'withdraw' : 'store';
};

/** Whether a stored receipt ties with the held authority. */
const isTie = function isTie(
	receipt: KernelIABAuthority | null,
	held: KernelIABAuthority | null,
	choice: ExplicitChoice
): receipt is KernelIABAuthority {
	return Boolean(
		receipt &&
		held &&
		fitsChoice(receipt, choice) &&
		receipt.confirmedAt === held.confirmedAt &&
		(receipt.tcString !== held.tcString || !sameVendorSelections(receipt, held))
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
	const isServiceSpecific = options.isServiceSpecific ?? true;
	/** Restrictions checked against the most recently published list. */
	let publisherRestrictions: PublisherRestriction[] = [];
	// Later changes to the caller's array must not change what is encoded.
	const configuredRestrictions = copyPublisherRestrictionInput(
		options.publisherRestrictions
	);
	const restrictionsForBlanket = (gvl: GlobalVendorList) => {
		try {
			return validatePublisherRestrictions(configuredRestrictions, {
				gvl,
				isServiceSpecific,
			});
		} catch {
			// whenReady(), generateTCString() and save() report this error.
			return [];
		}
	};

	const preloadedGvl = resolvePreloadedGvl(kernel, options);
	let reference =
		options.gvl === undefined
			? kernel.getSnapshot().iab?.gvlReference
			: undefined;

	// Seed the iab slice immediately so downstream consumers see the
	// cmpId and any preloaded GVL. A reference keeps the server-rendered
	// banner enabled while its list loads.
	seedInitialIAB(
		kernel,
		options,
		preloadedGvl ?? null,
		restrictionsForDisplay(configuredRestrictions, isServiceSpecific)
	);

	let cmpApi: CMPApi | null = null;
	let disposed = false;
	let authorityTimer: ReturnType<typeof setTimeout> | undefined;
	let confirmationGeneration = 0;
	let selectionRevision = 0;
	// Selection revision when the held authority was installed. A later
	// revision means the visitor changed selections without saving.
	let revisionAtAuthority = 0;
	// Set while this module withdraws an authority another runtime's
	// receipt still backs, so the shared receipt is not deleted.
	let keepReceipt = false;
	// Set while a save of this kernel commits, which happens synchronously
	// after `command:save:started`.
	let ownSaveCommitting = false;
	// A held authority not published because the choice changed after it
	// was confirmed. The receipt reload decides whether it goes or stays.
	let suppressedAuthority: KernelIABAuthority | null = null;
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
	/** Whether nothing changed while a stored receipt was being validated. */
	const unchangedSince = function unchangedSince(
		before: ConsentSnapshot,
		recordsGeneration: number,
		generation: number
	): boolean {
		const current = kernel.getSnapshot();
		return (
			!disposed &&
			!hydrationCancelled &&
			generation === confirmationGeneration &&
			kernel.getRecordsGeneration() === recordsGeneration &&
			current.iab === before.iab &&
			current.explicitChoice === before.explicitChoice &&
			current.subject === before.subject &&
			current.evaluationPolicy.choice.fingerprint ===
				before.evaluationPolicy.choice.fingerprint
		);
	};
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
		const { authority, restrictionsChanged } = await checkAuthority(
			readAuthorityReceipt(),
			hydrationSnapshot,
			Date.now(),
			publisherRestrictions
		);
		if (
			restrictionsChanged &&
			hydrationSnapshot.explicitChoice &&
			unchangedSince(hydrationSnapshot, recordsGeneration, generation) &&
			kernel.getSnapshot().activeUI === 'none'
		) {
			// A material change to what the visitor agreed to: show the
			// surface a changed policy shows. Gates wait for the new save.
			kernel.set.activeUI('banner');
		}
		if (
			authority &&
			unchangedSince(hydrationSnapshot, recordsGeneration, generation) &&
			// A receipt that grants what the stored choice denies, or predates
			// it, is not restored.
			fitsChoice(authority, hydrationSnapshot.explicitChoice)
		) {
			kernel.set.iab({ authority, tcString: authority.tcString });
			revisionAtAuthority = selectionRevision;
			armAuthorityTimer();
		}
	};
	/**
	 * Withdraw the held authority because it no longer fits `choice`, without
	 * deleting the shared receipt, which may be another tab's. Unless the
	 * visitor changed selections here without saving, the purposes of every
	 * denied category are switched off too.
	 */
	const withdrawAuthority = function withdrawAuthority(
		choice: ExplicitChoice | null
	): void {
		const keepSelections = selectionRevision !== revisionAtAuthority;
		const update: Partial<KernelIABState> = {
			authority: null,
			tcString: null,
		};
		if (!keepSelections && choice) {
			update.purposeConsents = withoutDeniedPurposes(
				readIAB(kernel).purposeConsents,
				choice
			);
		}
		keepReceipt = true;
		try {
			kernel.set.iab(update);
		} finally {
			keepReceipt = false;
		}
		if (!keepSelections) {
			revisionAtAuthority = selectionRevision;
		}
		armAuthorityTimer();
	};
	/**
	 * Bring the held authority in line with the reconciled `choice`: install
	 * `receipt` when it is compatible and at least as new, or when the held
	 * one conflicts; otherwise withdraw a conflicting held authority without
	 * deleting the shared receipt. Selections follow unless the visitor
	 * changed them here without saving. A tie neither side may win also
	 * removes the stored receipt (`receiptText`), so no page restores it.
	 */
	const applyReconciledAuthority = function applyReconciledAuthority(
		receipt: KernelIABAuthority | null,
		choice: ExplicitChoice,
		receiptText: string | null
	): void {
		const held = readIAB(kernel).authority;
		// A held authority that grants what the choice denies, or that
		// predates it, is withdrawn unless a fitting receipt replaces it.
		const heldConflicts = held !== null && !fitsChoice(held, choice);
		const keepSelections = selectionRevision !== revisionAtAuthority;
		const tie =
			held && !heldConflicts && isTie(receipt, held, choice)
				? settleTie(receipt, held)
				: null;
		if (tie === 'store' && held) {
			if (options.persistence !== false) {
				storeAuthority(held);
			}
			return;
		}
		if (tie === 'withdraw') {
			withdrawAuthority(choice);
			if (receiptText !== null) {
				clearAuthorityReceipt(receiptText);
			}
			return;
		}
		if (
			receipt &&
			(tie === 'install' ||
				shouldInstallReceipt(receipt, held, heldConflicts, choice))
		) {
			const update: Partial<KernelIABState> = {
				authority: receipt,
				tcString: receipt.tcString,
			};
			if (!keepSelections) {
				Object.assign(update, selectionsOf(receipt));
			}
			kernel.set.iab(update);
		} else if (heldConflicts) {
			withdrawAuthority(choice);
			return;
		} else {
			return;
		}
		if (!keepSelections) {
			revisionAtAuthority = selectionRevision;
		}
		armAuthorityTimer();
	};
	let listGeneration = 0;
	/** The list generation last published, and a reload waiting for it. */
	let publishedListGeneration = 0;
	let reloadAfterList = false;
	/**
	 * Records replaced at a hydration boundary, such as a choice another tab
	 * stored, can come with a newer authority receipt that tab wrote. Read
	 * the shared receipt and reconcile the held authority with the choice
	 * now in force (see {@link applyReconciledAuthority}), so `__tcfapi`
	 * never publishes a grant the choice denies.
	 */
	const reloadAuthority = async function reloadAuthority(): Promise<void> {
		const snapshot = kernel.getSnapshot();
		if (
			options.persistence === false ||
			disposed ||
			snapshot.model !== 'iab' ||
			snapshot.explicitChoice === null
		) {
			return;
		}
		const recordsGeneration = kernel.getRecordsGeneration();
		const generation = confirmationGeneration;
		const receiptText = readAuthorityReceiptText();
		// While a list loads, the restrictions and the snapshot's list still
		// describe the previous one. Check the receipt once it is published;
		// until then only withdraw a held authority the choice denies.
		const listLoading = publishedListGeneration !== listGeneration;
		if (listLoading) {
			reloadAfterList = true;
		}
		const receipt = listLoading
			? null
			: await validateAuthority(
					readAuthorityReceipt(receiptText),
					snapshot,
					Date.now(),
					publisherRestrictions
				);
		const current = kernel.getSnapshot();
		if (!listLoading && publishedListGeneration !== listGeneration) {
			reloadAfterList = true;
			return;
		}
		// A receipt replaced or removed while it was decoded is stale: the
		// storage event for that change starts its own reload, and a removal
		// has already withdrawn the held authority.
		if (
			disposed ||
			generation !== confirmationGeneration ||
			kernel.getRecordsGeneration() !== recordsGeneration ||
			current.evaluationPolicy.choice.fingerprint !==
				snapshot.evaluationPolicy.choice.fingerprint ||
			!current.explicitChoice ||
			readAuthorityReceiptText() !== receiptText
		) {
			return;
		}
		applyReconciledAuthority(receipt, current.explicitChoice, receiptText);
		// The reload kept the held authority: it still describes the choice,
		// so a TC string held back for this reload is published again.
		const kept = readIAB(kernel).authority;
		if (kept && kept === suppressedAuthority) {
			suppressedAuthority = null;
			cmpApi?.updateConsent(kept.tcString, undefined, true);
		}
	};
	const unsubscribeSaveStart = kernel.events.on('command:save:started', () => {
		ownSaveCommitting = true;
		queueMicrotask(() => {
			ownSaveCommitting = false;
		});
	});
	/**
	 * Hold back the held TC string until a receipt reload decides whether
	 * another tab's newer receipt replaces it, it is withdrawn, or it stands
	 * and is published again.
	 */
	const holdBackUntilReload = function holdBackUntilReload(
		held: KernelIABAuthority
	): void {
		suppressedAuthority = held;
		queueMicrotask(() => {
			void reloadAuthority();
		});
	};
	/**
	 * A category or vendor record that changed without a save of this kernel
	 * came from storage, such as another tab's save. When the held authority
	 * was confirmed before that change, its TC string may grant what the
	 * other save revoked, so it is held back. This tab's own saves never
	 * hold it back.
	 */
	const noteChoiceChange = function noteChoiceChange(
		previous: ConsentSnapshot,
		snapshot: ConsentSnapshot
	): void {
		const held = snapshot.iab?.authority;
		if (!held || ownSaveCommitting) {
			return;
		}
		const choiceChanged =
			snapshot.explicitChoice !== previous.explicitChoice &&
			predatesChoice(held, snapshot.explicitChoice);
		const vendorsChanged =
			snapshot.vendorChoice !== previous.vendorChoice &&
			(snapshot.vendorChoice?.confirmedAt ?? 0) > held.confirmedAt;
		if (choiceChanged || vendorsChanged) {
			holdBackUntilReload(held);
		}
	};
	/**
	 * Another tab stored a receipt. The category record can be unchanged
	 * (a save in the same millisecond, or one that only changed vendors), so
	 * the receipt is the only sign: stop publishing the held TC string at
	 * once, and reload the receipt. A removed receipt (another tab cleared
	 * storage or withdrew its TC string) withdraws the held one, since a
	 * page opened now would publish nothing either.
	 */
	const onReceiptStored = function onReceiptStored(event: StorageEvent): void {
		const held = readIAB(kernel).authority;
		if (
			options.persistence === false ||
			!held ||
			(event.key !== AUTHORITY_KEY && event.key !== null)
		) {
			return;
		}
		const snapshot = kernel.getSnapshot();
		if (readAuthorityReceiptText() === null) {
			withdrawAuthority(snapshot.explicitChoice);
			return;
		}
		holdBackUntilReload(held);
		// No kernel notification follows, so publish the hold here.
		cmpApi?.updateConsent('', undefined, snapshot.policyRule.model === 'iab');
	};
	if (typeof window !== 'undefined') {
		window.addEventListener('storage', onReceiptStored);
	}
	/** The TC string to publish: the held one unless suppressed. */
	const publishedTcString = function publishedTcString(): string {
		const authority = kernel.getSnapshot().iab?.authority;
		return authority && authority !== suppressedAuthority
			? authority.tcString
			: '';
	};
	/** Record a published list and run a reload that waited for it. */
	const markListPublished = (generation: number): void => {
		publishedListGeneration = generation;
		if (reloadAfterList) {
			reloadAfterList = false;
			void reloadAuthority();
		}
	};
	const unsubscribeClear = kernel.events.on('records:cleared', () => {
		hydrationCancelled = true;
		confirmationGeneration += 1;
		clearAuthorityReceipt();
	});
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
				Date.now(),
				publisherRestrictions
			)
		);
	};
	const restrictionsForList = (gvl: GlobalVendorList) => {
		try {
			return validatePublisherRestrictions(configuredRestrictions, {
				gvl,
				isServiceSpecific,
			});
		} catch (error) {
			// Authority confirmed against an earlier list must not keep gating
			// scripts once this CMP can no longer publish a string.
			if (readIAB(kernel).authority) {
				kernel.set.iab({ authority: null, tcString: '' });
			}
			throw error;
		}
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
			// An unsupported restriction stops the CMP here, before any TC
			// string could be written or published without it.
			publisherRestrictions = restrictionsForList(gvl);
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
			const beforeUpdate = kernel.getSnapshot();
			kernel.set.iab(update);
			markListPublished(generation);
			try {
				cmpApi ??= createCMPApi({
					cmpId,
					cmpVersion,
					gdprApplies: kernel.getSnapshot().policyRule.model === 'iab',
					gvl,
				});
				const current = kernel.getSnapshot();
				if (existingApi && current === beforeUpdate) {
					// Changed snapshots already publish through the kernel subscription.
					existingApi.updateConsent(
						readIAB(kernel).authority?.tcString ?? '',
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
		// Invalid restrictions stay invalid, so retrying would only replace a
		// supplied list with a fetched one.
		if (
			initializationError &&
			!disposed &&
			!(initializationError instanceof PublisherRestrictionError)
		) {
			initialization = initialize(undefined, reference);
		}
		let pending: Promise<void>;
		do {
			pending = initialization;
			// A replacement can finish before an obsolete request ever responds.
			// oxlint-disable-next-line no-await-in-loop -- Each iteration follows a new initialization generation.
			await Promise.race([pending, replaced]);
		} while (pending !== initialization);
		if (initializationError instanceof PublisherRestrictionError) {
			throw initializationError;
		}
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
					applyBlanket(kernel, gvl, value, restrictionsForBlanket(gvl));
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
	let previousRecordsGeneration = kernel.getRecordsGeneration();
	const unsubscribe = kernel.subscribe((snapshot: ConsentSnapshot) => {
		// A held authority that grants what the choice now denies (after a
		// reconciled denial, say) is withdrawn before anything is published,
		// so no vendor sees the stale grant. The withdrawal notifies again,
		// and that notification publishes.
		const held = snapshot.iab?.authority;
		if (
			held &&
			snapshot.model === 'iab' &&
			grantsDeniedCategory(held, snapshot.explicitChoice)
		) {
			previousSnapshot = snapshot;
			withdrawAuthority(snapshot.explicitChoice);
			return;
		}
		const previous = previousSnapshot;
		previousSnapshot = snapshot;
		noteChoiceChange(previous, snapshot);
		// Hydration advances the records generation after it notifies, so
		// compare once the commit has finished.
		queueMicrotask(() => {
			const recordsGeneration = kernel.getRecordsGeneration();
			if (recordsGeneration !== previousRecordsGeneration) {
				previousRecordsGeneration = recordsGeneration;
				void reloadAuthority();
			}
		});
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
		if (previousAuthority && !snapshot.iab?.authority && !keepReceipt) {
			clearAuthorityReceipt();
		}
		previousAuthority = snapshot.iab?.authority;
		armAuthorityTimer();
		if (!cmpApi) {
			return;
		}
		// Expiry can synchronously publish a newer snapshot while arming the
		// timer. Never restore the expired receipt from this notification.
		cmpApi.updateConsent(
			publishedTcString(),
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
			// Validated again by the encoder, which rejects unsupported input.
			publisherRestrictions: configuredRestrictions as
				| PublisherRestriction[]
				| undefined,
			purposeConsents: { ...iab.purposeConsents },
			purposeLegitimateInterests: { ...iab.purposeLegitimateInterests },
			specialFeatureOptIns: { ...iab.specialFeatureOptIns },
			vendorConsents: { ...vendorConsents },
			vendorLegitimateInterests: { ...vendorLegitimateInterests },
			vendorsDisclosed: disclosed,
		};
	};

	/**
	 * Rethrows a configuration error from list setup. Encoding reads the
	 * kernel's list, which can hold a list this CMP never validated, so it
	 * must not run once the restrictions were rejected. Synchronous, so the
	 * action clock and cancellation checks keep their current timing.
	 */
	const rejectInvalidRestrictions = (): void => {
		if (initializationError instanceof PublisherRestrictionError) {
			throw initializationError;
		}
	};

	const generateTC = async function generateTC(): Promise<string> {
		if (!readIAB(kernel).gvl && reference && !(await waitForReferencedList())) {
			throw new Error('IAB action cancelled while loading vendor data.');
		}
		rejectInvalidRestrictions();
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
			isServiceSpecific,
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
			applyBlanket(kernel, gvl, true, restrictionsForBlanket(gvl));
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
			unsubscribeSaveStart();
			if (typeof window !== 'undefined') {
				window.removeEventListener('storage', onReceiptStored);
			}
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
			applyBlanket(kernel, gvl, false, restrictionsForBlanket(gvl));
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
			rejectInvalidRestrictions();
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
				isServiceSpecific,
				publisherCountryCode: options.publisherCountryCode ?? 'US',
			});
			const authority = await validateAuthority(
				{ ...receipt, tcString },
				snapshot,
				Date.now(),
				publisherRestrictions
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
				// The saved selections are the authority's; nothing is unsaved.
				revisionAtAuthority = selectionRevision;
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
