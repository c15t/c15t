/**
 * The Global Vendor List a device serves, in the document's own key names.
 *
 * `/init` embeds this document under its `gvl` key, and a device that is open-
 * ing a disclosure is naming purposes and partners out of it, so the JavaScript
 * layer has to be able to read it without a web schema in its bundle.
 *
 * The names are the served document's, one for one, from `globalVendorListSchema`
 * in `packages/schema/src/shared/gvl.ts`, with no mobile-side renaming. Both
 * native cores argue for it the same way. Swift's `GlobalVendorList.swift`:
 * "The key names are the wire's, one for one, from `globalVendorListSchema` ...
 * with no mobile-side renaming", because the JSON it encodes is what this
 * package reads. Kotlin's `GlobalVendorList.kt`: a reader that renamed a field
 * "would have published a second vendor-list shape that nothing else can read".
 * A rename is invisible to Swift, to Kotlin, and to a type check, and it lands
 * as a disclosure row with no name behind it.
 *
 * This is a copy rather than an import for the reason `./vocabulary` gives for
 * the same choice: naming `@c15t/schema`, `@c15t/core`, or `@c15t/iab` from
 * here would put a web consent dependency into every phone app's graph and into
 * every published declaration file. Two gates keep the copy honest, and `@c15t/core`
 * is a devDependency for exactly this:
 *
 * - `__tests__/gvl.type-test.ts` compares every interface below with the kernel's
 *   re-export of the schema type, and runs under `bun run check-types`.
 * - `__tests__/gvl.test.ts` reads the names off the schema source and off both
 *   native cores' declarations and refuses an invention on any of the four.
 *
 * Key order is not load bearing in this document, unlike the category tables in
 * `./vocabulary`: every collection here is keyed by an id, and a GVL skips ids by
 * design, so the sequence a core enumerates in belongs to that core. What a
 * consumer may rely on is the name set and each name's type.
 *
 * @packageDocumentation
 */

/**
 * A purpose, special purpose, feature, or special feature.
 *
 * Mirrors `GVLPurpose` in `@c15t/core`, which is `gvlPurposeSchema`. The GVL
 * gives all five of those collections the same five fields, and both native
 * cores store them as one type -- `GVLDefinition` in Swift, `GvlLocalizedEntry`
 * in Kotlin -- so the four names below are the document's, not four shapes.
 */
export interface GVLPurpose {
	/** Pair copy the disclosure renders. */
	description: string;
	/** Long-form legal copy; absent on most entries. */
	descriptionLegal?: string;
	/** Duplicates the collection key, and the key wins: see {@link GVLVendor}. */
	id: number;
	illustrations: string[];
	name: string;
}

/**
 * Mirrors `GVLSpecialPurpose` in `@c15t/core`, which is `gvlSpecialPurposeSchema`.
 */
export interface GVLSpecialPurpose {
	description: string;
	descriptionLegal?: string;
	id: number;
	illustrations: string[];
	name: string;
}

/**
 * Mirrors `GVLFeature` in `@c15t/core`, which is `gvlFeatureSchema`.
 */
export interface GVLFeature {
	description: string;
	descriptionLegal?: string;
	id: number;
	illustrations: string[];
	name: string;
}

/**
 * Mirrors `GVLSpecialFeature` in `@c15t/core`, which is `gvlSpecialFeatureSchema`.
 */
export interface GVLSpecialFeature {
	description: string;
	descriptionLegal?: string;
	id: number;
	illustrations: string[];
	name: string;
}

/**
 * A stack: a named bundle of purposes a preference centre may offer as one row.
 *
 * Mirrors `GVLStack` in `@c15t/core`, which is `gvlStackSchema`.
 */
export interface GVLStack {
	description: string;
	id: number;
	name: string;
	/** Purpose ids the stack covers. */
	purposes: number[];
	specialFeatures: number[];
}

/**
 * A data category (`gvl.dataCategories`), which vendors reference by id.
 *
 * Mirrors `GVLDataCategory` in `@c15t/core`, which is `gvlDataCategorySchema`.
 */
export interface GVLDataCategory {
	description: string;
	id: number;
	name: string;
}

/**
 * One partner's privacy-page links, in the language `langId` names.
 *
 * Mirrors `GVLVendorUrl` in `@c15t/core`, which is `gvlVendorUrlSchema`.
 */
export interface GVLVendorUrl {
	langId: string;
	/** The partner's claim to a legitimate interest, where it publishes one. */
	legIntClaim?: string;
	privacy?: string;
}

/** How long a partner keeps the data each purpose produces. */
export interface GVLVendorDataRetention {
	/** Purpose id to seconds. The keys are ids written as strings. */
	purposes?: Record<string, number>;
	/** Special purpose id to seconds. */
	specialPurposes?: Record<string, number>;
	/** Seconds, for purposes the per-purpose maps do not name. */
	stdRetention?: number;
}

/** A partner's disclosure-endpoint budget. */
export interface GVLVendorOverflow {
	httpGetLimit: number;
}

/**
 * One partner's entry, which is most of what a preference centre renders.
 *
 * Mirrors `GVLVendor` in `@c15t/core`, which is `gvlVendorSchema`, with one
 * deliberate difference, stated on the field.
 */
export interface GVLVendor {
	/**
	 * Seconds a cookie survives, where the partner publishes a number.
	 *
	 * This is the one field the mobile reading is wider on than the schema. The
	 * schema spells "no claim" as a present key whose value is null:
	 * `v.nullable(v.number())`. Swift stores it as `Int?` and says of the pair
	 * that "an explicit null and an absent key are the same answer, and neither
	 * is a refusal", and Kotlin writes it the same way -- an optional it does not
	 * encode when it holds nothing. A reader therefore gets one spelling, and the
	 * mirror takes the one it can test.
	 *
	 * `iab-display-model.ts` still takes `number | null` on its own rows, because
	 * by then the display model has already normalised the absence away.
	 */
	cookieMaxAgeSeconds?: number;
	cookieRefresh: boolean;
	/** Ids of the {@link GlobalVendorList.dataCategories} this partner processes. */
	dataCategories?: number[];
	dataRetention?: GVLVendorDataRetention;
	/**
	 * Set means the partner was withdrawn from the list.
	 *
	 * Both cores test this for truthiness rather than against a clock, so an empty
	 * string is an active partner: `GVL.js` drops any vendor with a `deletedDate`
	 * out of `gvl.vendors`, and Swift's `GVLVendor.isDeleted` and Kotlin's
	 * `TcVendor.isDeleted` keep that exactly.
	 */
	deletedDate?: string;
	deviceStorageDisclosureUrl?: string;
	features: number[];
	/** Purposes whose basis a publisher restriction may switch. */
	flexiblePurposes: number[];
	/**
	 * Duplicates the key of this entry in {@link GlobalVendorList.vendors}.
	 *
	 * Both web readers trust the key over this field: `processPurposes` in
	 * `packages/iab/src/headless/dialog-data.ts` takes the id from the key it is
	 * holding, and `@iabtechlabtcf/core`'s `GVL` overwrites `vendor.id` with the
	 * key before the encoder asks. Read the key.
	 */
	id: number;
	/** Purposes claimed under a legitimate-interest basis. */
	legIntPurposes: number[];
	name: string;
	overflow?: GVLVendorOverflow;
	/** Purposes claimed under a consent basis. */
	purposes: number[];
	/** Carried for disclosure; the TC String encoder reads four lists, not this one. */
	specialFeatures: number[];
	specialPurposes: number[];
	urls: GVLVendorUrl[];
	usesCookies: boolean;
	usesNonCookieAccess: boolean;
}

/**
 * The IAB Global Vendor List as `/init` serves it.
 *
 * Mirrors `GlobalVendorList` in `@c15t/core`, which re-exports the type inferred
 * from `globalVendorListSchema`.
 *
 * A device reaches this document by two routes, and they carry the same names.
 *
 * - iOS folds it into the snapshot at the `iab` slot of `./snapshot`: Swift's
 *   `ConsentCore.prepare(iab:)` fills the slot from `initResponse.gvl`, and the
 *   envelope then persists it so the next launch renders the same disclosure with
 *   no network.
 * - Android keeps it on the stored envelope as `gvl` and hands the same document
 *   to a caller through `C15tKernel.vendorListBody()`. Its retention test names
 *   the two promises that matter to a reader: `a refresh with no gvl keeps the
 *   list the device already holds`, and `the list comes back on the next launch
 *   through a failed init`.
 *
 * Both cores gate a list on the same four fields before they hold one --
 * `vendorListVersion`, `tcfPolicyVersion`, `purposes`, `vendors`, from
 * `packages/iab/src/tcf/fetch-gvl.ts` -- and both refuse silently, reading a
 * refused list as "no list today". Those four are the only members here a reader
 * can treat as settled. Everything below them belongs to a third-party
 * document, and the cores stay forgiving about its contents on purpose: one
 * partner missing a `name` is a detail, not a reason to leave a device with no
 * vendor list at all. Inside a vendor, the names the encoder reads are `purposes`,
 * `legIntPurposes`, `specialPurposes`, `flexiblePurposes`, and `deletedDate` --
 * Kotlin's `READING_CONSENT_KEYS` writes that list down next to the code that
 * needs it.
 */
export interface GlobalVendorList {
	/** Absent on a list that does not publish data categories. */
	dataCategories?: Record<string, GVLDataCategory>;
	features: Record<string, GVLFeature>;
	/** The GVL document-format revision. */
	gvlSpecificationVersion: number;
	lastUpdated: string;
	purposes: Record<string, GVLPurpose>;
	specialFeatures: Record<string, GVLSpecialFeature>;
	specialPurposes: Record<string, GVLSpecialPurpose>;
	stacks: Record<string, GVLStack>;
	/** The policy revision this list was published under, into `TcfPolicyVersion`. */
	tcfPolicyVersion: number;
	/** Which vendor list this is, into the TC String's `VendorListVersion`. */
	vendorListVersion: number;
	/** Partners, keyed by id written as a string. */
	vendors: Record<string, GVLVendor>;
}
