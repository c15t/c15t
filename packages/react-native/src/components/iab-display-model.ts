/**
 * The row model an IAB disclosure surface draws, in the shape the web draws it.
 *
 * `@c15t/iab` publishes one display model -- `resolveIABDialogDisplayModel` in
 * `packages/iab/src/headless/display-model.ts` -- and every web adapter reads
 * its rows from there rather than deriving its own. That is what keeps four
 * preference centres listing the same purposes the same number of times. A
 * phone cannot run that derivation: it carries no consent kernel and, by this
 * package's own rule, no JavaScript TCF codec either. So the rows arrive as
 * props, and this file is the shape they arrive in.
 *
 * Every type here is a field-for-field mirror of one web type, and the
 * `Mirrors` line on each one names it. The mirror is exact on purpose,
 * including the fields a phone screen does not draw yet: a parity test builds
 * the web model from the same fixture and compares the two name for name, and a
 * mirror that dropped a field could not fail that comparison, which is the
 * whole point of having it. Nothing here is re-decided. `testId` is the web's
 * `testId`, row order is the web's row order, and `toggle` names the same
 * consent map.
 *
 * Two rules hold the boundary:
 *
 * - This file imports nothing at runtime. It cannot: `@c15t/core`, `c15t`, and
 *   `@iabtechlabtcf/core` are all absent from the package outside its tests.
 * - When the web model and this mirror disagree, the web model wins. Fix the
 *   mirror; never fix the assertion.
 *
 * @packageDocumentation
 */

/**
 * Which TCF object a row is, and which section it belongs to.
 *
 * Mirrors `HeadlessIABDisplayRowKind`. A `'stack'` is excluded from
 * {@link ConsentIabDisplayRow} the way the web excludes it, because a stack
 * carries purposes rather than one toggle of its own.
 */
export type ConsentIabDisplayRowKind =
	| 'purpose'
	| 'stack'
	| 'special-feature'
	| 'special-purpose'
	| 'feature';

/**
 * Which consent map a row's toggle writes to.
 *
 * Mirrors `HeadlessIABDisplayToggle`. `'none'` is the locked essential rows:
 * they render a toggle that is on and cannot be moved, because their legal
 * basis is not consent.
 */
export type ConsentIabDisplayToggle = 'purpose' | 'special-feature' | 'none';

/**
 * Which tab of the disclosure is showing.
 *
 * Mirrors `HeadlessIABPreferenceTab`.
 */
export type ConsentIabTab = 'purposes' | 'vendors';

/**
 * A partner's id: a number for a GVL vendor, and possibly a string for one the
 * CMP registered by hand.
 *
 * Mirrors `HeadlessIABVendorId`. Consent maps key it with `String(id)`, which
 * is what the web does and what {@link ConsentIabSelection} keeps.
 */
export type ConsentIabVendorId = number | string;

/**
 * One partner, as the disclosure lists it.
 *
 * Mirrors `HeadlessIABProcessedVendor` field for field. The two legal-basis
 * lists are what the vendors tab splits its legs from: `purposes` is what the
 * partner claims under consent, `legIntPurposes` what it claims under
 * legitimate interest, and one partner may claim the same id under both.
 */
export interface ConsentIabProcessedVendor {
	/** `cookieMaxAgeSeconds` on the GVL entry; `null` when it carries none. */
	cookieMaxAgeSeconds: number | null;
	/** Whether the storage is refreshed on each visit. */
	cookieRefresh?: boolean;
	/** Per-purpose retention, as the GVL publishes it. */
	dataRetention?: {
		purposes?: Record<number, number>;
		specialPurposes?: Record<number, number>;
		stdRetention?: number;
	};
	/** What the partner declares it processes, as GVL data ids. */
	dataDeclaration?: number[];
	/** Where the partner discloses what it stores on the device. */
	deviceStorageDisclosureUrl: string | null;
	/** Feature ids the partner claims. */
	features: number[];
	/** The GVL vendor id, or the custom partner's own key. */
	id: ConsentIabVendorId;
	/** Whether the partner is absent from the GVL. */
	isCustom?: boolean;
	/** Legitimate-interest purpose ids. */
	legIntPurposes: number[];
	/** Where the partner states its legitimate-interest claim. */
	legitimateInterestUrl?: string | null;
	/** Display name. */
	name: string;
	/** Privacy policy URL; empty when the GVL carries none. */
	policyUrl: string;
	/** Consent-based purpose ids. */
	purposes: number[];
	/** Special feature ids. */
	specialFeatures: number[];
	/** Special purpose ids. */
	specialPurposes: number[];
	/** Whether the partner sets cookies. */
	usesCookies: boolean;
	/** Whether this partner is a legitimate-interest vendor for the row it sits in. */
	usesLegitimateInterest?: boolean;
	/** Whether the partner reads device storage without a cookie. */
	usesNonCookieAccess: boolean;
}

/**
 * One purpose, special purpose, feature, or special feature, and the partners
 * that claim it.
 *
 * Mirrors `HeadlessIABDisplayRow`.
 */
export interface ConsentIabDisplayRow {
	/** What the row covers, in the GVL's own words. */
	description: string;
	/** The GVL id within its own kind. Not unique across kinds. */
	id: number;
	/** Illustrations the GVL gives for the row, one per entry. */
	illustrations: string[];
	/** Row kind, never `'stack'`. */
	kind: Exclude<ConsentIabDisplayRowKind, 'stack'>;
	/** Whether the toggle is fixed on. */
	locked: boolean;
	/** Display name. */
	name: string;
	/** The row's `data-testid`. Unique across the whole surface. */
	testId: string;
	/** Which consent map the toggle writes to. */
	toggle: ConsentIabDisplayToggle;
	/** Partners that claim this row, under either legal basis. */
	vendors: ConsentIabProcessedVendor[];
}

/**
 * A stack, with the purposes it absorbed.
 *
 * Mirrors `HeadlessIABDisplayStackRow`. Those purposes are rows in their own
 * right, which is what the web's disclosure draws when a stack is opened, and
 * what makes a stack's toggle a shortcut over N toggles rather than a further
 * consent the subject never gave.
 */
export interface ConsentIabDisplayStackRow {
	/** What the stack covers. */
	description: string;
	/** The GVL stack id. */
	id: number;
	/** Always `'stack'`, which is how a caller tells the two apart. */
	kind: 'stack';
	/** Display name. */
	name: string;
	/** The purposes the stack covers, as rows in their own right. */
	purposes: ConsentIabDisplayRow[];
	/** The row's `data-testid`. */
	testId: string;
}

/**
 * Any row in {@link ConsentIabDisplayModel.consentRows}.
 *
 * Mirrors `HeadlessIABDisplayConsentRow`.
 */
export type ConsentIabDisplayConsentRow =
	| ConsentIabDisplayRow
	| ConsentIabDisplayStackRow;

/**
 * A purpose the disclosure resolved, with the partners that claim it.
 *
 * Mirrors `HeadlessIABProcessedPurpose`.
 */
export interface ConsentIabProcessedPurpose {
	/** What it covers. */
	description: string;
	/** The GVL's legal text, where it carries one. */
	descriptionLegal?: string;
	/** The purpose id. */
	id: number;
	/** Illustrations, one per entry. */
	illustrations: string[];
	/** Set on the special purposes only. */
	isSpecialPurpose?: boolean;
	/** Display name. */
	name: string;
	/** Partners that claim it, under either legal basis. */
	vendors: ConsentIabProcessedVendor[];
}

/**
 * A feature or special feature the disclosure resolved.
 *
 * Mirrors `HeadlessIABProcessedFeature`. The web keeps it structurally identical
 * to `HeadlessIABProcessedSpecialFeature` and this mirror does the same, because
 * the two differ in which TCF object the id names and not in what a row carries.
 */
export interface ConsentIabProcessedFeature {
	/** What it covers. */
	description: string;
	/** The GVL's legal text, where it carries one. */
	descriptionLegal?: string;
	/** The feature id. */
	id: number;
	/** Illustrations, one per entry. */
	illustrations: string[];
	/** Display name. */
	name: string;
	/** Partners that claim it. */
	vendors: ConsentIabProcessedVendor[];
}

/**
 * A special feature the disclosure resolved.
 *
 * Mirrors `HeadlessIABProcessedSpecialFeature`.
 */
export interface ConsentIabProcessedSpecialFeature {
	/** What it covers. */
	description: string;
	/** The GVL's legal text, where it carries one. */
	descriptionLegal?: string;
	/** The special feature id. */
	id: number;
	/** Illustrations, one per entry. */
	illustrations: string[];
	/** Display name. */
	name: string;
	/** Partners that claim it. */
	vendors: ConsentIabProcessedVendor[];
}

/**
 * A GVL stack with its purposes resolved.
 *
 * Mirrors `HeadlessIABProcessedStack`.
 */
export interface ConsentIabProcessedStack {
	/** What it covers. */
	description: string;
	/** The stack id. */
	id: number;
	/** Display name. */
	name: string;
	/** The purposes it covers. */
	purposes: ConsentIabProcessedPurpose[];
}

/**
 * The processed GVL the rows were built from.
 *
 * Mirrors `HeadlessIABDialogData`. The vendors tab needs this half rather than
 * the row list: the web reads a partner's claims off the processed purposes, so
 * the purpose names behind a partner's ids come from here.
 */
export interface ConsentIabDialogData {
	/** Features with at least one partner. */
	features: ConsentIabProcessedFeature[];
	/** Whether the GVL is still on its way. */
	isLoading: boolean;
	/** Whether there is a GVL to render. */
	isReady: boolean;
	/** Every purpose with at least one partner. */
	purposes: ConsentIabProcessedPurpose[];
	/** Special features with at least one partner. */
	specialFeatures: ConsentIabProcessedSpecialFeature[];
	/** Special purposes with at least one partner. */
	specialPurposes: ConsentIabProcessedPurpose[];
	/** The stacks the purposes grouped into. */
	stacks: ConsentIabProcessedStack[];
	/** Purpose 1 and whatever no stack absorbed. */
	standalonePurposes: ConsentIabProcessedPurpose[];
	/** GVL vendors plus custom vendors. */
	totalVendors: number;
}

/**
 * Everything the disclosure draws, already ordered.
 *
 * Mirrors `HeadlessIABDialogDisplayModel`, which is what the drawer's `model`
 * prop takes. A caller on a phone builds it on the far side of the bridge: run
 * `resolveIABDialogDisplayModel` where the GVL is and pass the result over, or
 * build the same shape out of a native snapshot. The drawer reads it and
 * nothing else, so it draws exactly what its caller was told.
 */
export interface ConsentIabDisplayModel {
	/** Rows the visitor decides on, in render order. */
	consentRows: ConsentIabDisplayConsentRow[];
	/** The processed GVL the rows were built from. */
	data: ConsentIabDialogData;
	/** Distinct vendors named by the essential rows. */
	essentialPartnerCount: number;
	/** The locked "essential functions" rows, in render order. */
	essentialRows: ConsentIabDisplayRow[];
	/** Whether the GVL is still on its way. */
	isLoading: boolean;
	/** Whether there is a GVL to render. */
	isReady: boolean;
	/** The count next to the purposes tab. */
	purposeTabCount: number;
	/**
	 * The partners to list on the vendors tab, in the order to list them in.
	 *
	 * The one field with no counterpart on `HeadlessIABDialogDisplayModel`. The
	 * web takes that list off `iabState.gvl` -- every vendor in it, sorted by
	 * name -- and there is no GVL on a phone to read from, so the caller hands
	 * the same rows over. `ConsentIabProcessedVendor` is the exact type the web
	 * maps each GVL vendor into before it renders one, so this is the web's own
	 * list rather than a mobile restatement of it.
	 */
	vendors: ConsentIabProcessedVendor[];
	/** The count next to the vendors tab. */
	vendorTabCount: number;
}

/**
 * What one press of save writes.
 *
 * Mirrors the three consent maps the web dialog reads its switch positions
 * from -- `purposeConsents`, `specialFeatureOptIns` and `vendorConsents` --
 * plus the objections it holds in `vendorLegitimateInterests`. Keys follow the
 * web: purposes and special features are their numeric ids, vendors are
 * `String(id)`, and a legitimate interest is `true` when the subject has not
 * objected.
 *
 * The drawer keeps one of these in local state and hands the whole of it to
 * `onSave` in one call, which is what lets the native side encode one TC String
 * rather than four partial ones.
 *
 * @example
 * ```ts
 * const selection: ConsentIabSelection = {
 *     purposeConsents: { 1: true },
 *     specialFeatureOptIns: { 1: false },
 *     vendorConsents: { '755': true },
 *     vendorLegitimateInterests: { '10': false },
 * };
 * ```
 */
export interface ConsentIabSelection {
	/** Consent per purpose id. */
	purposeConsents: Record<number, boolean>;
	/** Consent per special feature id. */
	specialFeatureOptIns: Record<number, boolean>;
	/** Legitimate interest per vendor, `true` meaning not objected. */
	vendorLegitimateInterests: Record<string, boolean>;
	/** Consent per vendor, keyed `String(id)`. */
	vendorConsents: Record<string, boolean>;
}
