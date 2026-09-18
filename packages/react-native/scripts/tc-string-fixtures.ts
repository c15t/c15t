/**
 * The `tc-string` fixture kind: golden IAB TCF Transparency and Consent Strings.
 *
 * The Swift and Kotlin cores are new TC String encoders and decoders with no
 * maintained native SDK to adopt, so the oracle is the reference JavaScript
 * implementation, `@iabtechlabtcf/core`, at the exact version `@c15t/iab` already
 * ships. Nothing in this file is a hand-written idea of what a TC String looks
 * like: every `expected` is a byte string this package produced and read back.
 *
 * Two populations, recorded inside each fixture as `population` and `expects`, so a
 * runner branches on the data rather than on the fixture id:
 *
 * - `parity` -- a model built from exactly the fields `@c15t/iab` populates
 *   (`packages/iab/src/tcf/tc-string.ts`), with its defaults. A native encoder must
 *   reproduce these byte for byte AND read them back. Byte equality here is the whole
 *   point: two encoders that agree on the input but disagree on one bit produce
 *   strings that vendors read as different consent.
 * - `decode-coverage` -- a model that reaches past what `@c15t/iab` ever writes:
 *   publisher restrictions, `purposeOneTreatment`, `useNonStandardTexts`, vendor and
 *   custom-purpose ids wide enough that no range encoding is trivial. A native
 *   decoder must read these correctly; its encoder is explicitly not graded on them,
 *   because c15t cannot produce the input. Without this population a decoder that
 *   stops after the last field c15t happens to write would pass every parity vector
 *   and still be wrong.
 *
 * Both populations run under the clock `index.json` pins. That clock matters more
 * than it looks: a core segment carries `created` and `lastUpdated`, so without a
 * frozen clock a golden string is not reproducible. `parity` vectors go one step
 * further and carry c15t's own timestamp rule -- the day floor of the clock, not the
 * clock -- which is why `input.now` and `input.model.created` differ. See
 * {@link c15tTimestamp}.
 *
 * Where the reference loses information on the way out, the loss is written into
 * that fixture's `notes` by {@link fidelityNotes}, which compares what went in with
 * what came back rather than restating a list someone once believed. That list is
 * the honest scope boundary for the native ports.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import {
	Base64Url,
	BitLength,
	GVL,
	PurposeRestriction,
	RestrictionType,
	SegmentIDs,
	TCModel,
	TCString,
} from '@iabtechlabtcf/core';
import type { Vendor, VendorList } from '@iabtechlabtcf/core';

// -- The oracle -------------------------------------------------------------

/**
 * The `@iabtechlabtcf/core` version these vectors were cut against.
 *
 * Pinned rather than read from the install, and checked against it at build time,
 * so a lockfile that drifts fails the run instead of quietly re-deriving every
 * golden string under a different encoder.
 */
const ORACLE_VERSION = '1.5.21';

/** What produced these expectations, so a runner can name it in a failure. */
export const TC_STRING_ORACLE = {
	package: '@iabtechlabtcf/core',
	repository: 'InteractiveAdvertisingBureau/iabtcf-es',
	version: ORACLE_VERSION,
} as const;

/**
 * Read the installed oracle's own version out of its package.json.
 *
 * The `exports` map of `@iabtechlabtcf/core` does not expose `package.json`, so
 * this walks up from the resolved entry point instead of importing the manifest.
 */
const installedOracleVersion = function installedOracleVersion(): string {
	const require = createRequire(import.meta.url);
	let cursor = dirname(
		dirname(dirname(require.resolve('@iabtechlabtcf/core')))
	);
	for (let depth = 0; depth < 6; depth += 1) {
		try {
			const manifest = JSON.parse(
				readFileSync(resolve(cursor, 'package.json'), 'utf8')
			) as { name?: string; version?: string };
			if (manifest.name === TC_STRING_ORACLE.package) {
				if (typeof manifest.version !== 'string') {
					break;
				}
				return manifest.version;
			}
		} catch {
			// Keep walking; the caller fails on the mismatch, which is the answer.
		}
		cursor = dirname(cursor);
	}
	throw new Error(
		`Could not read the version of ${TC_STRING_ORACLE.package} from its package.json, so the ${'tc-string'} fixtures cannot state which encoder produced them.`
	);
};

/**
 * The three publisher restriction types as wire integers.
 *
 * A fixture carries the integer a decoder reads, not a TypeScript enum, and the
 * assertion at the foot of this file refuses the file the moment the oracle's enum
 * stops agreeing with these numbers.
 */
const RESTRICTION_TYPE = {
	NOT_ALLOWED: 0,
	REQUIRE_CONSENT: 1,
	REQUIRE_LI: 2,
} as const;

/** The encoding options every vector was cut with: TC String encoding version 2. */
const ENCODE_VERSION = 2 as const;

// -- Populations ------------------------------------------------------------

/** The two populations, in the order a runner will read them. */
export const TC_STRING_POPULATIONS = ['parity', 'decode-coverage'] as const;

export type TcStringPopulation = (typeof TC_STRING_POPULATIONS)[number];

/**
 * What a runner must assert for one population, as data.
 *
 * `parity` vectors are encodable by c15t and therefore graded on both directions;
 * `decode-coverage` vectors are not, so only the decode half is asserted.
 */
/**
 * The id prefix each population owns, so `tc-string-decode-*` is a stable way to name
 * the decode-only half even though the field value is `decode-coverage`.
 */
const POPULATION_PREFIXES: Record<TcStringPopulation, string> = {
	'decode-coverage': 'tc-string-decode-',
	parity: 'tc-string-parity-',
};

const EXPECTS: Record<
	TcStringPopulation,
	{ decode: boolean; encode: boolean }
> = {
	'decode-coverage': { decode: true, encode: false },
	parity: { decode: true, encode: true },
};

// -- The vendor list --------------------------------------------------------

/**
 * The vendor ids every vector declares.
 *
 * Low ids, a contiguous run straddling the 45/46 bitfield-to-range crossover, and
 * four isolated ids high enough that a 16-bit `maxId` and a two-word range entry
 * both get exercised. One list for every fixture means one vendor list for a
 * native test harness to load, and it keeps the diff between two fixtures down to
 * the consent state under test.
 */
const VENDOR_IDS: readonly number[] = [
	...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
	...[41, 42, 43, 44, 45, 46, 47],
	60,
	300,
	500,
	700,
];

/** Every purpose a declared vendor claims, so no positive signal is pruned by accident. */
const ALL_PURPOSES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** The legitimate-interest purposes, and the one flexible purpose. */
const LEG_INT_PURPOSES: readonly number[] = [2, 7, 9, 10];

/**
 * Purposes 7 and 9 are flexible for every vendor. Purpose 9 sits in
 * `legIntPurposes` and purpose 7 sits in `purposes`, which between them make both
 * directions of publisher restriction survivable: the reference drops a
 * `REQUIRE_CONSENT` restriction unless the vendor declares that purpose flexibly
 * *and* under legitimate interest, and drops `REQUIRE_LI` unless it declares it
 * flexibly *and* under consent. Without these two, `publisherRestrictions` encodes
 * as a bare zero count and every restriction vector here would be vacuous.
 */
const FLEXIBLE_PURPOSES: readonly number[] = [7, 9];

/**
 * One vendor declaration as the fixture states it, widened to what the reference
 * reads. The fixture's array is the input; nothing here is re-derived from a
 * constant, so a runner that loads `input.vendorList` feeds the encoder the same
 * declarations this build did.
 *
 * The four device-storage-disclosure fields `Vendor` declares -- `usesCookies` and
 * friends -- are left out because neither the encoder nor the decoder reads them, and
 * carrying them in twenty-six fixtures would put storage-disclosure noise in front of
 * the declarations that actually decide what gets encoded.
 */
const vendorFor = function vendorFor(vendor: TcStringVendor): Vendor {
	return {
		features: [...vendor.features],
		flexiblePurposes: [...vendor.flexiblePurposes],
		id: vendor.id,
		legIntPurposes: [...vendor.legIntPurposes],
		name: `Fixture Vendor ${String(vendor.id)}`,
		purposes: [...vendor.purposes],
		specialFeatures: [...vendor.specialFeatures],
		specialPurposes: [...vendor.specialPurposes],
	};
};

/** How the fixture names a vendor list, in a field order a runner can mirror. */
interface TcStringVendor {
	features: number[];
	flexiblePurposes: number[];
	id: number;
	legIntPurposes: number[];
	purposes: number[];
	specialFeatures: number[];
	specialPurposes: number[];
}

interface TcStringVendorList {
	language: string;
	tcfPolicyVersion: number;
	vendorListVersion: number;
	vendors: TcStringVendor[];
}

/** The two special features the fixtures opt in to. */
const SPECIAL_FEATURES = {
	1: {
		description: 'Use precise geolocation data.',
		id: 1,
		name: 'Geolocation',
	},
	2: {
		description: 'Match data with other data sources.',
		id: 2,
		name: 'Match data',
	},
};

/**
 * The vendor list object the reference consumes, built in a fixed key order so the
 * encoder's pruning decisions depend only on the fixture and not on this file's
 * formatting.
 */
const vendorListJson = function vendorListJson(
	list: TcStringVendorList
): VendorList {
	const vendors: Record<string, Vendor> = {};
	for (const vendor of list.vendors) {
		vendors[String(vendor.id)] = vendorFor(vendor);
	}
	const purposes: VendorList['purposes'] = {};
	for (const id of ALL_PURPOSES) {
		purposes[String(id)] = {
			description: `Fixture purpose ${String(id)}.`,
			id,
			name: `Purpose ${String(id)}`,
		};
	}
	return {
		dataCategories: {},
		features: {},
		gvlSpecificationVersion: 3,
		lastUpdated: '2026-02-02T00:00:00Z',
		purposes,
		specialFeatures: SPECIAL_FEATURES as VendorList['specialFeatures'],
		specialPurposes: {},
		stacks: {},
		tcfPolicyVersion: list.tcfPolicyVersion,
		vendorListVersion: list.vendorListVersion,
		vendors: vendors as unknown as VendorList['vendors'],
	};
};

// -- The model --------------------------------------------------------------

/** One publisher restriction, as the fixture states it and as a decoder reads it. */
interface TcStringRestriction {
	purposeId: number;
	restrictionType: number;
	vendorIds: number[];
}

/**
 * The `TCModel` a vector replays, in the field order the core segment encodes them.
 *
 * `vendorListVersion` and `policyVersion` are deliberately absent: with a vendor
 * list attached, the reference's getters answer straight from the list and silently
 * ignore a write, so the only honest place for them is `input.vendorList`. See
 * {@link fidelityNotes}.
 */
interface TcStringModel {
	consentLanguage: string;
	consentScreen: number;
	created: number;
	cmpId: number;
	cmpVersion: number;
	isServiceSpecific: boolean;
	lastUpdated: number;
	numCustomPurposes: number;
	publisherConsents: number[];
	publisherCountryCode: string;
	publisherCustomConsents: number[];
	publisherCustomLegitimateInterests: number[];
	publisherLegitimateInterests: number[];
	publisherRestrictions: TcStringRestriction[];
	purposeConsents: number[];
	purposeLegitimateInterests: number[];
	purposeOneTreatment: boolean;
	specialFeatureOptins: number[];
	supportOOB: boolean;
	useNonStandardTexts: boolean;
	vendorConsents: number[];
	vendorLegitimateInterests: number[];
	version: number;
	vendorsAllowed: number[];
	vendorsDisclosed: number[];
}

// -- Fixture shape ----------------------------------------------------------

export interface TcStringFixture {
	protocolVersion: number;
	kind: 'tc-string';
	id: string;
	description: string;
	notes: string[];
	/** Which population this vector belongs to; see this file's header. */
	population: TcStringPopulation;
	/** What to assert, as data, so a runner does not guess from the id. */
	expects: { decode: boolean; encode: boolean };
	oracle: typeof TC_STRING_ORACLE & { encodeOptions: TcStringEncodeOptions };
	input: {
		/** The pinned evaluation clock, verbatim from `index.json`. */
		now: number;
		encodingOptions: TcStringEncodeOptions;
		vendorList: TcStringVendorList;
		model: TcStringModel;
	};
	expected: {
		encode: {
			/**
			 * The 3-bit segment type of each segment, in order: 0 core, 1
			 * vendorsDisclosed, 2 vendorsAllowed, 3 publisherTC. Derived from the
			 * leading bits the way `TCString.decode` does, never declared by hand, so
			 * a decoder harness can pick the right reader per segment without
			 * hard-coding how many segments a given shape produces.
			 */
			segmentTypes: number[];
			/** The dot-separated segments of that string, in order. */
			segments: string[];
			/** The exact base64url string the reference encoder produced. */
			tcString: string;
		};
		decode: {
			/** What the reference decoder read back out of `tcString`. */
			fields: TcStringDecodedFields;
		};
	};
}

interface TcStringEncodeOptions {
	isForVendors: boolean;
	version: 2;
}

/**
 * A decoded vector: every model field plus the two the reference answers from the
 * vendor list, and the `maxId` the decoder recovered for each vendor vector.
 */
interface TcStringDecodedFields extends TcStringModel {
	policyVersion: number;
	vendorListVersion: number;
	/**
	 * `maxId` per vector. The reference surfaces no "was this a range or a bit
	 * field" flag on a decoded vector, so a decoder that wants to prove it consumed
	 * the right number of bits has to check `maxId` and its own bit cursor rather
	 * than read the encoding type back.
	 */
	vectorMaxIds: Record<string, number>;
}

// -- Plumbing ---------------------------------------------------------------

/** The day floor c15t stamps `created` and `lastUpdated` with. */
const DAY_MS = 86_400_000;

/**
 * c15t truncates the confirmation time to a UTC day before it reaches the model
 * (`packages/iab/src/tcf/tc-string.ts`, `confirmedDay`). A parity vector that used
 * the raw clock would therefore pin a string c15t can never produce, and both native
 * cores would faithfully implement a timestamp no c15t install ever writes.
 */
const c15tTimestamp = function c15tTimestamp(now: number): number {
	return Math.floor(now / DAY_MS) * DAY_MS;
};

/** Sorted, de-duplicated ids out of a reference `Vector`. */
const idsOf = function idsOf(vector: {
	values: () => IterableIterator<number>;
}): number[] {
	return [...new Set(vector.values())].sort((a, b) => a - b);
};

/** The restrictions a decoded vector carries, enumerated through public API only. */
const restrictionsOf = function restrictionsOf(vector: {
	getPurposes: () => number[];
	getRestrictionType: (
		vendorId: number,
		purposeId: number
	) => RestrictionType | undefined;
	getVendors: () => number[];
}): TcStringRestriction[] {
	const purposes = vector.getPurposes().sort((a, b) => a - b);
	const vendors = [...new Set(vector.getVendors())].sort((a, b) => a - b);
	const grouped = new Map<string, TcStringRestriction>();
	for (const purposeId of purposes) {
		for (const vendorId of vendors) {
			const restrictionType = vector.getRestrictionType(vendorId, purposeId);
			if (restrictionType === undefined) {
				continue;
			}
			const key = `${String(purposeId)}:${String(restrictionType)}`;
			const existing = grouped.get(key);
			if (existing) {
				existing.vendorIds.push(vendorId);
			} else {
				grouped.set(key, {
					purposeId,
					restrictionType,
					vendorIds: [vendorId],
				});
			}
		}
	}
	return [...grouped.values()].sort(
		(a, b) => a.purposeId - b.purposeId || a.restrictionType - b.restrictionType
	);
};

/** Read a decoded model back into the fixture's field map. */
const decodedFieldsOf = function decodedFieldsOf(
	decoded: TCModel
): TcStringDecodedFields {
	return {
		cmpId: Number(decoded.cmpId),
		cmpVersion: Number(decoded.cmpVersion),
		consentLanguage: decoded.consentLanguage,
		consentScreen: Number(decoded.consentScreen),
		created: decoded.created.getTime(),
		isServiceSpecific: decoded.isServiceSpecific,
		lastUpdated: decoded.lastUpdated.getTime(),
		numCustomPurposes: Number(decoded.numCustomPurposes),
		policyVersion: Number(decoded.policyVersion),
		publisherConsents: idsOf(decoded.publisherConsents),
		publisherCountryCode: decoded.publisherCountryCode,
		publisherCustomConsents: idsOf(decoded.publisherCustomConsents),
		publisherCustomLegitimateInterests: idsOf(
			decoded.publisherCustomLegitimateInterests
		),
		publisherLegitimateInterests: idsOf(decoded.publisherLegitimateInterests),
		publisherRestrictions: restrictionsOf(decoded.publisherRestrictions),
		purposeConsents: idsOf(decoded.purposeConsents),
		purposeLegitimateInterests: idsOf(decoded.purposeLegitimateInterests),
		purposeOneTreatment: decoded.purposeOneTreatment,
		specialFeatureOptins: idsOf(decoded.specialFeatureOptins),
		supportOOB: decoded.supportOOB,
		useNonStandardTexts: decoded.useNonStandardTexts,
		vectorMaxIds: {
			publisherCustomConsents: Number(decoded.numCustomPurposes),
			vendorConsents: decoded.vendorConsents.maxId,
			vendorLegitimateInterests: decoded.vendorLegitimateInterests.maxId,
			vendorsAllowed: decoded.vendorsAllowed.maxId,
			vendorsDisclosed: decoded.vendorsDisclosed.maxId,
		},
		vendorConsents: idsOf(decoded.vendorConsents),
		vendorLegitimateInterests: idsOf(decoded.vendorLegitimateInterests),
		vendorListVersion: Number(decoded.vendorListVersion),
		vendorsAllowed: idsOf(decoded.vendorsAllowed),
		vendorsDisclosed: idsOf(decoded.vendorsDisclosed),
		version: Number(decoded.version),
	};
};

// -- Segment identity -------------------------------------------------------

/**
 * The four segment type ids a v2 string can carry, read out of the bits rather than
 * asserted. Index is the id a decoder finds in the leading 3 bits.
 */
const SEGMENT_NAMES: readonly string[] = [
	'core',
	'vendorsDisclosed',
	'vendorsAllowed',
	'publisherTC',
];

/** The 3-bit segment type, exactly as `TCString.decode` reads it. */
const segmentTypeOf = function segmentTypeOf(encodedSegment: string): number {
	const bits = Base64Url.decode(encodedSegment).slice(0, BitLength.segmentType);
	return Number.parseInt(bits, 2);
};

// -- Fidelity ---------------------------------------------------------------

/** Ids `source` carries that `result` lost. */
const dropped = function dropped(
	source: readonly number[],
	result: readonly number[]
): number[] {
	const seen = new Set(result);
	return source.filter((id) => !seen.has(id));
};

/** A run of ids compressed for a note: `[41, 42, 43, 60]` becomes `41-43, 60`. */
const idRanges = function idRanges(ids: readonly number[]): string {
	const sorted = [...new Set(ids)].sort((a, b) => a - b);
	const runs: string[] = [];
	let index = 0;
	while (index < sorted.length) {
		let end = index;
		while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) {
			end += 1;
		}
		const low = String(sorted[index]);
		const high = String(sorted[end]);
		runs.push(index === end ? low : `${low}-${high}`);
		index = end + 1;
	}
	return runs.join(', ');
};

/**
 * The losses this vector actually exhibits, stated as notes.
 *
 * Every line here is produced by comparing what went into the encoder with what came
 * out of the decoder, not from a standing list of known defects. A loss that stops
 * happening in a future oracle stops being claimed, and a new one gets claimed the
 * moment it appears, which is the only way these notes stay worth the native lanes'
 * time. Each one is a place where a native port that round-trips faithfully is
 * nevertheless wrong, so they belong in the fixture rather than in a comment.
 */
const fidelityNotes = function fidelityNotes(
	model: TcStringModel,
	fields: TcStringDecodedFields,
	segmentTypes: readonly number[]
): string[] {
	const notes: string[] = [];

	const prunedLi = dropped(
		model.purposeLegitimateInterests,
		fields.purposeLegitimateInterests
	);
	if (prunedLi.length > 0) {
		notes.push(
			`purposeLegitimateInterests loses ${idRanges(prunedLi)}: the reference's pre-encoder refuses legitimate interest for purposes 1, 3, 4, 5 and 6, so a decoder never sees them. A port that encodes them anyway writes a string the reference will read back differently.`
		);
	}

	const prunedConsents = dropped(model.purposeConsents, fields.purposeConsents);
	if (prunedConsents.length > 0) {
		notes.push(
			`purposeConsents loses ${idRanges(prunedConsents)} between the model and the decoded read-back.`
		);
	}

	const prunedVendors = dropped(model.vendorConsents, fields.vendorConsents);
	if (prunedVendors.length > 0) {
		notes.push(
			`vendorConsents loses ${idRanges(prunedVendors)}: the reference drops a positive vendor signal the vendor list gives no consent purpose for, so the encoder's answer depends on input.vendorList and not on the model alone.`
		);
	}

	const prunedVendorLi = dropped(
		model.vendorLegitimateInterests,
		fields.vendorLegitimateInterests
	);
	if (prunedVendorLi.length > 0) {
		notes.push(
			`vendorLegitimateInterests loses ${idRanges(prunedVendorLi)} for the same reason: no declared legitimate-interest purpose, no encoded signal.`
		);
	}

	if (model.consentLanguage !== fields.consentLanguage) {
		notes.push(
			`consentLanguage is not writable: the reference overwrites the model's "${model.consentLanguage}" with the vendor list's language "${fields.consentLanguage}", so a port that reads the app's language produces a different string here.`
		);
	}

	if (model.supportOOB !== fields.supportOOB) {
		notes.push(
			`supportOOB is never encoded: the model said ${String(model.supportOOB)} and the decoder answers ${String(fields.supportOOB)}, because the v2 core segment has no slot for it. It changes which segments get written, so an encoder has to hold it out of band.`
		);
	}

	for (const restriction of model.publisherRestrictions) {
		const readBack = fields.publisherRestrictions.find(
			(candidate) =>
				candidate.purposeId === restriction.purposeId &&
				candidate.restrictionType === restriction.restrictionType
		);
		if (!readBack) {
			notes.push(
				`publisherRestrictions purpose ${String(restriction.purposeId)} type ${String(restriction.restrictionType)} disappears entirely: the reference refuses a restriction whose legal basis the vendor list does not declare flexibly, so the vector carries a bare zero restriction count.`
			);
			continue;
		}
		const omitted = dropped(restriction.vendorIds, readBack.vendorIds);
		const materialised = dropped(readBack.vendorIds, restriction.vendorIds);
		if (omitted.length > 0 || materialised.length > 0) {
			notes.push(
				`publisherRestrictions for purpose ${String(restriction.purposeId)} does not round-trip: the encoder merges the declared ids into one inclusive range whenever the vendor list names no vendor in the gap, and the decoder materialises every id in it, so ${idRanges(restriction.vendorIds)} reads back as ${idRanges(readBack.vendorIds)}. A native decoder must reproduce the extra ids exactly, and a native encoder that emitted the tighter ranges the input implies would produce a different string.`
			);
		}
	}

	if (model.numCustomPurposes > 0) {
		notes.push(
			`only the numCustomPurposes count (${String(model.numCustomPurposes)}) survives: the reference never encodes customPurposes declarations, so custom purpose names and descriptions are out of scope for both ports even though the bits for the opt-ins are present.`
		);
	}

	if (model.vendorsAllowed.length > 0 && fields.vendorsAllowed.length === 0) {
		notes.push(
			'vendorsAllowed is not written for this vector: the reference only appends the vendorsAllowed segment when the string is for vendors, supportOOB is on, and the list is non-empty. The field reads back empty rather than absent.'
		);
	}

	if (!segmentTypes.includes(3)) {
		notes.push(
			'the string carries no publisherTC segment, so every publisherConsents, publisherLegitimateInterests, numCustomPurposes and publisherCustom* field reads back at its zero rather than being absent. A decoder must not treat that zero as a stored empty choice, and an encoder must know the segment is conditional.'
		);
	}

	if (fields.vendorListVersion !== 0 && fields.policyVersion !== 0) {
		notes.push(
			`vendorListVersion (${String(fields.vendorListVersion)}) and policyVersion (${String(fields.policyVersion)}) are read out of input.vendorList, not out of the model: with a vendor list attached the reference's getters ignore anything written onto those two fields, which is why input.model omits them.`
		);
	}

	return notes;
};

// -- Defaults ---------------------------------------------------------------

/** The CMP identity c15t writes. 28 is the registered example id its docs use. */
const C15T_CMP_ID = 28;
const C15T_CMP_VERSION = 1;

/**
 * A model with c15t's defaults in it.
 *
 * `supportOOB` and `isServiceSpecific` sit at the reference's own constructor
 * defaults rather than at c15t's, because c15t writes `isServiceSpecific` and leaves
 * `supportOOB` alone -- so `false` here is "c15t never touched it", which is what a
 * parity vector has to reproduce.
 */
const c15tModel = function c15tModel(
	now: number,
	overrides: Partial<TcStringModel>
): TcStringModel {
	return {
		cmpId: C15T_CMP_ID,
		cmpVersion: C15T_CMP_VERSION,
		consentLanguage: 'EN',
		consentScreen: 1,
		created: c15tTimestamp(now),
		isServiceSpecific: true,
		lastUpdated: c15tTimestamp(now),
		numCustomPurposes: 0,
		publisherConsents: [],
		publisherCountryCode: 'US',
		publisherCustomConsents: [],
		publisherCustomLegitimateInterests: [],
		publisherLegitimateInterests: [],
		publisherRestrictions: [],
		purposeConsents: [],
		purposeLegitimateInterests: [],
		purposeOneTreatment: false,
		specialFeatureOptins: [],
		supportOOB: false,
		useNonStandardTexts: false,
		vendorConsents: [],
		vendorLegitimateInterests: [],
		vendorsAllowed: [],
		vendorsDisclosed: [],
		version: ENCODE_VERSION,
		...overrides,
	};
};

/** The same declarations, expressed as the fixture's own vendor shape. */
const fixtureVendor = function fixtureVendor(id: number): TcStringVendor {
	return {
		features: [],
		flexiblePurposes: [...FLEXIBLE_PURPOSES],
		id,
		legIntPurposes: [...LEG_INT_PURPOSES],
		purposes: [...ALL_PURPOSES],
		specialFeatures: [],
		specialPurposes: [],
	};
};

interface VendorListOverrides {
	language?: string;
	tcfPolicyVersion?: number;
	vendorListVersion?: number;
}

/** The vendor list every vector shares, apart from the two fields a case varies. */
const vendorListFor = function vendorListFor(
	overrides: VendorListOverrides = {}
): TcStringVendorList {
	return {
		language: overrides.language ?? 'EN',
		tcfPolicyVersion: overrides.tcfPolicyVersion ?? 5,
		vendorListVersion: overrides.vendorListVersion ?? 142,
		vendors: VENDOR_IDS.map((id) => fixtureVendor(id)),
	};
};

/** Every purpose id the fixtures ever consent to, ascending. */
const ALL_PURPOSE_IDS = [...ALL_PURPOSES];

/** `count` consecutive ids starting at `first`. */
const runOf = function runOf(first: number, count: number): number[] {
	return Array.from({ length: count }, (_, index) => first + index);
};

/** The even ids up to and including 700, for a long vector that stays a bitfield. */
const EVEN_VENDOR_IDS_UP_TO_700 = Array.from(
	{ length: 350 },
	(_, index) => (index + 1) * 2
);

// -- The case table ---------------------------------------------------------

/** A vector as this file declares it, before the clock turns it into a string. */
interface CaseSpec {
	/** Defaults to a string the CMP hands a vendor, which is what c15t produces. */
	encodingOptions?: { isForVendors?: boolean };
	/** One sentence on the difference this case exists to catch. */
	description: string;
	id: string;
	/** Fields to move off c15t's defaults; everything else stays at them. */
	model: Partial<TcStringModel>;
	/** Case-specific notes, prepended to the fidelity notes the build derives. */
	notes: string[];
	population: TcStringPopulation;
	/**
	 * Which reading of the frozen clock each timestamp carries. `day` is c15t's
	 * day floor, `clock` is the clock itself. Both default to `day` because that is
	 * what @c15t/iab writes; a vector that wants the two fields to differ asks for
	 * them here rather than hard-coding a millisecond value that would only be right
	 * for one clock.
	 */
	timestamps?: {
		created?: 'clock' | 'day';
		lastUpdated?: 'clock' | 'day';
	};
	vendorList?: VendorListOverrides;
}

/**
 * The shared note on who wrote the model, so a runner reading one file knows whether
 * the input is something `@c15t/iab` can emit or something only the reference can.
 */
const POPULATION_NOTES: Record<TcStringPopulation, string> = {
	'decode-coverage':
		'Population decode-coverage: this model reaches past what @c15t/iab writes, so expects.encode is false and only the decode half is graded. An encoder that cannot produce this input is not wrong.',
	parity:
		'Population parity: every non-default field here is one @c15t/iab writes, so expects.encode is true and a native encoder has to reproduce tcString byte for byte.',
};

/**
 * Where the two populations stop being a label and become a checked claim.
 *
 * A parity vector is only worth having if it really is a string c15t can produce, so
 * every field outside the set `packages/iab/src/tcf/tc-string.ts` touches has to sit
 * at c15t's default. Marking a decode-coverage case as `parity` fails the build here
 * rather than quietly handing both native cores a byte string no c15t install emits
 * and a parity failure neither of them can fix.
 */
const assertParitySurface = function assertParitySurface(
	id: string,
	model: TcStringModel,
	now: number
): void {
	const untouched: string[] = [];
	if (model.purposeOneTreatment) {
		untouched.push('purposeOneTreatment');
	}
	if (model.useNonStandardTexts) {
		untouched.push('useNonStandardTexts');
	}
	if (model.supportOOB) {
		untouched.push('supportOOB');
	}
	if (model.numCustomPurposes !== 0) {
		untouched.push('numCustomPurposes');
	}
	for (const key of [
		'publisherConsents',
		'publisherCustomConsents',
		'publisherCustomLegitimateInterests',
		'publisherLegitimateInterests',
		'publisherRestrictions',
		'vendorsAllowed',
	] as const) {
		if (model[key].length > 0) {
			untouched.push(key);
		}
	}
	if (model.consentScreen !== 1) {
		untouched.push('consentScreen');
	}
	if (model.consentLanguage !== 'EN') {
		untouched.push('consentLanguage');
	}
	if (model.publisherCountryCode !== 'US') {
		untouched.push('publisherCountryCode');
	}
	if (
		model.created !== c15tTimestamp(now) ||
		model.lastUpdated !== c15tTimestamp(now)
	) {
		untouched.push('created/lastUpdated');
	}
	if (untouched.length > 0) {
		throw new Error(
			`${id} is marked population=parity but leaves ${untouched.join(', ')} outside what @c15t/iab writes. Either move those to a decode-coverage vector or drop them here; a parity byte string neither native core can reach from a c15t install certifies an encoder nobody has to build.`
		);
	}
};

/** Hand the fixture's model to a real `TCModel`, in the reference's field order. */
const applyToReference = function applyToReference(
	tcModel: TCModel,
	model: TcStringModel
): void {
	tcModel.created = new Date(model.created);
	tcModel.lastUpdated = new Date(model.lastUpdated);
	tcModel.cmpId = model.cmpId;
	tcModel.cmpVersion = model.cmpVersion;
	tcModel.consentScreen = model.consentScreen;
	tcModel.consentLanguage = model.consentLanguage;
	tcModel.publisherCountryCode = model.publisherCountryCode;
	tcModel.isServiceSpecific = model.isServiceSpecific;
	tcModel.useNonStandardTexts = model.useNonStandardTexts;
	tcModel.supportOOB = model.supportOOB;
	tcModel.purposeOneTreatment = model.purposeOneTreatment;
	for (const id of model.specialFeatureOptins) {
		tcModel.specialFeatureOptins.set(id);
	}
	for (const id of model.purposeConsents) {
		tcModel.purposeConsents.set(id);
	}
	for (const id of model.purposeLegitimateInterests) {
		tcModel.purposeLegitimateInterests.set(id);
	}
	for (const id of model.vendorConsents) {
		tcModel.vendorConsents.set(id);
	}
	for (const id of model.vendorLegitimateInterests) {
		tcModel.vendorLegitimateInterests.set(id);
	}
	for (const id of model.vendorsDisclosed) {
		tcModel.vendorsDisclosed.set(id);
	}
	for (const id of model.vendorsAllowed) {
		tcModel.vendorsAllowed.set(id);
	}
	for (const id of model.publisherConsents) {
		tcModel.publisherConsents.set(id);
	}
	for (const id of model.publisherLegitimateInterests) {
		tcModel.publisherLegitimateInterests.set(id);
	}
	tcModel.numCustomPurposes = model.numCustomPurposes;
	for (const id of model.publisherCustomConsents) {
		tcModel.publisherCustomConsents.set(id);
	}
	for (const id of model.publisherCustomLegitimateInterests) {
		tcModel.publisherCustomLegitimateInterests.set(id);
	}
	for (const restriction of model.publisherRestrictions) {
		const purposeRestriction = new PurposeRestriction(
			restriction.purposeId,
			restriction.restrictionType
		);
		for (const vendorId of restriction.vendorIds) {
			tcModel.publisherRestrictions.add(vendorId, purposeRestriction);
		}
	}
};

/** Encode one case, twice, and refuse it if the two answers differ. */
const encodeTwice = function encodeTwice(
	vendorList: TcStringVendorList,
	model: TcStringModel,
	encodingOptions: TcStringEncodeOptions,
	id: string
): string {
	const once = function once(): string {
		// The language is a construction option, not a field of the vendor-list JSON:
		// build the GVL without it and the reference quietly answers EN no matter what
		// the fixture says, which would leave a consent-language vector asserting a loss
		// that never happened.
		const gvl = new GVL(vendorListJson(vendorList), {
			language: vendorList.language,
		});
		const tcModel = new TCModel(gvl);
		applyToReference(tcModel, model);
		return TCString.encode(tcModel, { ...encodingOptions });
	};
	const first = once();
	const second = once();
	if (first !== second) {
		throw new Error(
			`${id}: the reference encoded the same model twice into two different strings ("${first}" then "${second}"). A golden vector has to be reproducible; a nondeterministic encoder is a finding, not something to sort or retry into agreement.`
		);
	}
	return first;
};

/** Every `tc-string` vector this package ships. */
const CASE_SPECS: readonly CaseSpec[] = [
	// -- population: parity --------------------------------------------------
	{
		description:
			'A c15t install that loaded the vendor list but recorded nothing: every vector empty, so the string is all of the fixed-width fields and three zero-length vectors.',
		id: 'tc-string-parity-nothing-set',
		model: {},
		notes: [
			'The empty vector is not absent: vendorConsents, vendorLegitimateInterests and vendorsDisclosed each still write a 16-bit maxId of 0 and an encoding-type bit, and a decoder that reads "no bits left" as "field missing" rather than "no ids" will disagree with the reference about whether consent was recorded.',
			'created and lastUpdated are the UTC day floor of input.now, not input.now, because @c15t/iab truncates the confirmation time before it reaches the model. Reproducing this string from input.now is wrong by hours.',
		],
		population: 'parity',
	},
	{
		description:
			'All ten GVL purposes consented, which fills the fixed 24-bit purpose bitfield up to purpose 10 and leaves the rest of the field zero.',
		id: 'tc-string-parity-purposes-full',
		model: { purposeConsents: ALL_PURPOSE_IDS },
		notes: [
			'purposeConsents is a fixed 24-bit field whatever its contents: it never range-encodes, so the only vector in a v2 core string that chooses between a bitfield and a range is a vendor vector. Anything that range-encodes a purpose list is not reading this field.',
		],
		population: 'parity',
	},
	{
		description:
			'Legitimate interests and special feature opt-ins requested together, which is where the reference starts deleting what it was handed.',
		id: 'tc-string-parity-li-and-special-features',
		model: {
			purposeLegitimateInterests: ALL_PURPOSE_IDS,
			specialFeatureOptins: [1, 2],
		},
		notes: [
			'specialFeatureOptins is a 12-bit field and sits before purposeConsents in the core segment, so an off-by-one against the 24-bit purpose field shows up here and nowhere else.',
		],
		population: 'parity',
	},
	{
		description:
			'Vendors were disclosed but not consented to, the shape a c15t preference centre reaches when the user opened the list and saved nothing.',
		id: 'tc-string-parity-vendor-consents-empty',
		model: { vendorsDisclosed: [1, 2, 3] },
		notes: [
			'vendorsDisclosed is not pruned against the vendor list the way the consent vectors are, so an id the list does not name still round-trips here. Only vendorConsents and vendorLegitimateInterests are.',
		],
		population: 'parity',
	},
	{
		description:
			'One vendor consented, the smallest vector that is not empty, at an id low enough that the bitfield encoding wins outright.',
		id: 'tc-string-parity-vendor-consents-single',
		model: { vendorConsents: [4] },
		notes: [
			'One id is not one range entry. At maxId 4 the header plus a 4-bit bitfield is shorter than any range, so the encoder must choose the bitfield; a port that reaches for a range whenever the list is short produces a longer string than the reference.',
		],
		population: 'parity',
	},
	{
		description:
			'Five contiguous vendors ending at id 45, the last maxId at which a bitfield can still win.',
		id: 'tc-string-parity-vendor-consents-bitfield',
		model: { vendorConsents: runOf(41, 5) },
		notes: [
			'The reference compares a candidate range encoding against the bitfield and keeps the bitfield unless a range is strictly smaller; 45 is the boundary id, so this vector and tc-string-parity-single-vendor-id-46 are the two halves of one decision.',
		],
		population: 'parity',
	},
	{
		description:
			'Six contiguous vendors ending at id 46, the first maxId at which a range encoding wins.',
		id: 'tc-string-parity-vendor-consents-range',
		model: { vendorConsents: runOf(41, 6) },
		notes: [
			'This is the same list as tc-string-parity-vendor-consents-bitfield plus one id, and it switches encoding. Nothing in the string announces the switch except the single encoding-type bit after maxId, so a decoder that assumes bitfield reads garbage from the second word on.',
		],
		population: 'parity',
	},
	{
		description:
			'A single vendor at id 45, kept as a bitfield; the twin of id 46 below, which range-encodes.',
		id: 'tc-string-parity-single-vendor-id-45',
		model: { vendorConsents: [45] },
		notes: [
			'Two fixtures, one vendor each, four apart in nothing but the id, and the shorter encoding flips between them. This is the sharpest available pin on the bitfield-versus-range rule and the one most likely to be implemented off-by-one.',
		],
		population: 'parity',
	},
	{
		description:
			'A single vendor at id 46, which range-encodes even though the list holds exactly one id.',
		id: 'tc-string-parity-single-vendor-id-46',
		model: { vendorConsents: [46] },
		notes: [
			'One id, encoded as numEntries 1 with a single-id entry, because the range is now smaller than a 46-bit bitfield. A port that special-cases "one vendor means bitfield" fails this vector while passing every low-id one.',
		],
		population: 'parity',
	},
	{
		description:
			'Five vendors scattered across the id space up to 700, which range-encodes as five single-id entries.',
		id: 'tc-string-parity-vendor-consents-sparse-range',
		model: { vendorConsents: [8, 60, 300, 500, 700] },
		notes: [
			'A 16-bit maxId against a 700-bit bitfield: the range wins by a mile here, and every entry is a single rather than a pair, so this is the vector that checks a decoder handles numEntries > 1 with the single-or-range bit clear.',
		],
		population: 'parity',
	},
	{
		description:
			'The even vendor ids up to 700 disclosed, a long vector that goes back to a bitfield because 350 ranges cost more than 700 bits.',
		id: 'tc-string-parity-vendors-disclosed-long-bitfield',
		model: { vendorsDisclosed: EVEN_VENDOR_IDS_UP_TO_700 },
		notes: [
			'The encoder stops extending ranges once they stop being smaller and falls back to the bitfield, and that decision is taken from the last state of the loop rather than the best one, so a port that picks the smaller of the two complete encodings can disagree at sizes like this one. Check the string, not your arithmetic.',
			'Most of the 350 ids here are absent from input.vendorList and all of them survive: vendorsDisclosed is the one vendor vector the reference never prunes against the list.',
		],
		population: 'parity',
	},
	{
		description:
			'Consent and legitimate interest recorded for a vendor the list does not name, next to legitimate interest asked for under purposes that forbid it.',
		id: 'tc-string-parity-pruned-signals',
		model: {
			purposeLegitimateInterests: ALL_PURPOSE_IDS,
			vendorConsents: [1, 400],
			vendorLegitimateInterests: [2, 400],
		},
		notes: [
			'Every deletion this vector performs happens before encoding, in the reference, from the vendor list. A native encoder that writes what the app asked for produces a different string than one that writes what the reference kept, which makes this the vector that decides whether an encoder is allowed to be more faithful than its oracle.',
		],
		population: 'parity',
	},
	{
		description:
			'The same consent recorded against a TCF policy version 4 vendor list, which changes one 6-bit field in the core segment.',
		id: 'tc-string-parity-policy-version-4',
		model: { purposeConsents: [1, 2, 7], vendorConsents: [1, 2] },
		notes: [
			'The policy version is a fixed 6-bit field and comes from the vendor list, not the model, so a port that carries it as consent state will drift the moment the list is refreshed under the same consent.',
		],
		population: 'parity',
		vendorList: { tcfPolicyVersion: 4 },
	},
	{
		description:
			'The identical consent against a TCF policy version 5 vendor list, the pair to version 4 above.',
		id: 'tc-string-parity-policy-version-5',
		model: { purposeConsents: [1, 2, 7], vendorConsents: [1, 2] },
		notes: [
			'Diff this against tc-string-parity-policy-version-4: the only difference in the whole string is inside the 6 bits that carry policyVersion, which makes the pair a cheap end-to-end check that a port reads the field from the vendor list.',
		],
		population: 'parity',
		vendorList: { tcfPolicyVersion: 5 },
	},
	{
		description:
			'A vendor list version at 4095, the largest value the 12-bit field holds, so the segment widths a port must assume are pinned at their ceiling.',
		id: 'tc-string-parity-vendor-list-version-max',
		model: { purposeConsents: [1], vendorsDisclosed: [1] },
		notes: [
			'vendorListVersion is 12 bits and no wider: the reference throws rather than truncating, so 4096 is not a segment width change, it is an encoder that cannot build the string at all. The widths that do move in a v2 string come from a vendor vector maxId and from numCustomPurposes, never from this field.',
		],
		population: 'parity',
		vendorList: { vendorListVersion: 4095 },
	},
	{
		description:
			'The same consent written to global scope rather than service-specific, which is the difference between two segments and three.',
		id: 'tc-string-parity-service-specific-false',
		model: {
			isServiceSpecific: false,
			purposeConsents: [1, 2, 7],
			vendorConsents: [1, 2],
		},
		notes: [
			'The publisherTC segment only follows a service-specific string, so this vector has no publisher section at all and every publisher field decodes to zero rather than to an empty stored choice. That difference is load bearing: it is the difference between "the user never saw a publisher purpose" and "the user declined it".',
		],
		population: 'parity',
	},
	{
		description:
			'An app that asked for its own consent language while the vendor list it loaded is a different one, which is the common real-world case the reference settles silently.',
		id: 'tc-string-parity-consent-language-from-vendor-list',
		model: { purposeConsents: [1], vendorConsents: [1] },
		notes: [
			'The reference overwrites the model language with the vendor list language before encoding, so the string says DE while the app said EN. A native encoder that reads the language off the SDK configuration produces a byte that differs here.',
		],
		population: 'parity',
		vendorList: { language: 'DE' },
	},

	// -- population: decode-coverage ----------------------------------------
	{
		description:
			'A service-specific string that declares purpose one treatment, a field @c15t/iab never writes and a vendor reads as "the publisher told me the user needs no purpose-one consent".',
		id: 'tc-string-decode-purpose-one-treatment-service-specific',
		model: {
			purposeConsents: [2, 3, 4],
			purposeOneTreatment: true,
			vendorConsents: [1, 2],
		},
		notes: [
			'purposeOneTreatment is one bit sitting between a 24-bit purpose field and a 12-bit language field, and it changes what a vendor does with purpose one consent. A decoder that never lands on it still decodes everything around it correctly, which is exactly the hole this population exists to close.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'purposeOneTreatment set on a global-scope string, which the TCF policy forbids and the reference encodes anyway.',
		id: 'tc-string-decode-purpose-one-treatment-global',
		model: {
			isServiceSpecific: false,
			purposeConsents: [2, 3, 4],
			purposeOneTreatment: true,
		},
		notes: [
			'The policy says a global string must carry purposeOneTreatment false and a CMP that reads true has to treat the string as invalid and re-establish consent. The reference does neither: it encodes the combination and decodes it back without complaint. A native core that enforces the rule will reject a string this vector contains, so the enforcement is a policy decision on top of the codec and belongs in neither core quietly.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'The two remaining core-segment bits c15t leaves alone: non-standard texts set, and supportOOB on with the string addressed to vendors.',
		id: 'tc-string-decode-non-standard-texts-and-oob',
		model: {
			isServiceSpecific: false,
			purposeConsents: [1, 2],
			supportOOB: true,
			useNonStandardTexts: true,
		},
		notes: [
			'The TCF v1 name for this bit was useNonStandardStacks; the reference calls it useNonStandardTexts and the v2 spec spells it useNonStandardTexts. Same bit, one position after isServiceSpecific. A port documented against the v1 vocabulary will name it differently from its own decoder output.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'One publisher restriction whose vendors are scattered so the encoder emits three range entries under a single purpose, two singles and one pair, with ids past 40 throughout.',
		id: 'tc-string-decode-restrictions-mixed-single-and-range',
		model: {
			publisherRestrictions: [
				{
					purposeId: 9,
					restrictionType: RESTRICTION_TYPE.REQUIRE_CONSENT,
					vendorIds: [41, 60, 300, 700],
				},
			],
			purposeConsents: [1],
			vendorConsents: [41],
		},
		notes: [
			'This is the vector that pins numEntries above 1 with both single-word and pair-word entries in the same purpose: 41 alone, then a range, then 700 alone. It also pins what a range means on the way out, which is every id in the interval rather than the ids that went in.',
			'The restriction survives at all only because every vendor in input.vendorList declares purpose 9 in flexiblePurposes. Remove that declaration and the reference silently encodes a zero restriction count.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'Three publisher restrictions under three purposes, one for each restriction type the wire defines, all over vendor ids above 40.',
		id: 'tc-string-decode-restrictions-three-types',
		model: {
			publisherRestrictions: [
				{
					purposeId: 9,
					restrictionType: RESTRICTION_TYPE.REQUIRE_CONSENT,
					vendorIds: [41],
				},
				{
					purposeId: 2,
					restrictionType: RESTRICTION_TYPE.NOT_ALLOWED,
					vendorIds: runOf(42, 6),
				},
				{
					purposeId: 7,
					restrictionType: RESTRICTION_TYPE.REQUIRE_LI,
					vendorIds: [60],
				},
			],
			purposeConsents: [1],
		},
		notes: [
			'numRestrictions is a 12-bit count in front of a variable-length body, so the only way to know the core segment has ended is to have consumed exactly that many bodies. Three bodies under three purposes is the minimum case that catches a decoder that reads one and stops, or reads to the end of the segment.',
			'The three restriction types are the whole wire vocabulary -- 0 not allowed, 1 require consent, 2 require legitimate interest -- and each one survives only if input.vendorList declares the purpose flexibly in the right direction, so a decoder has to read all three and an encoder has no business deciding which ones to keep.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'A string whose core segment ends in a publisher restriction count of zero with everything before it populated, which is where a decoder learns the body has no terminator.',
		id: 'tc-string-decode-restrictions-empty-tail',
		model: {
			purposeConsents: [1, 2, 7],
			purposeOneTreatment: true,
			useNonStandardTexts: true,
			vendorConsents: runOf(41, 7),
			vendorLegitimateInterests: [60],
		},
		notes: [
			'There is no terminator word after the publisher restrictions in a v2 core string: an empty list is a 12-bit zero count and then the segment ends, mid-word. A port carrying a v1 habit of reading a sentinel will run off the end of the core segment here, and the padding bits after it are zero, which makes the mistake look like a valid extra entry rather than an overrun.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'Publisher custom purposes at 50, so the two custom vectors are 50 bits wide instead of zero and the publisher section stops being a fixed size.',
		id: 'tc-string-decode-wide-custom-purposes',
		model: {
			numCustomPurposes: 50,
			publisherConsents: [1, 2],
			publisherCustomConsents: [1, 45],
			publisherCustomLegitimateInterests: [50],
		},
		notes: [
			'This is the one place in a v2 string where a field width comes from another field in the same segment: numCustomPurposes is 6 bits so the ceiling is 63, and both custom vectors are that wide. A decoder that hard-codes 24 here reads the tail of the publisher section at the wrong offset and still finds plausible-looking values.',
			'numCustomPurposes above 40 also means the two custom vectors no longer fit in the same 64-bit word as their header, so a word-aligned reader has to cross a word boundary mid-field.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'A global string addressed to vendors that supports out-of-band disclosure and narrows it to three vendors, the four-segment shape.',
		encodingOptions: { isForVendors: true },
		id: 'tc-string-decode-vendors-allowed-segment',
		model: {
			isServiceSpecific: false,
			purposeConsents: [1, 2],
			supportOOB: true,
			vendorConsents: [1, 2],
			vendorsAllowed: [60, 300, 700],
			vendorsDisclosed: [1, 2, 3],
		},
		notes: [
			'Segment order is core, vendorsDisclosed, vendorsAllowed, publisherTC, and each non-core segment opens with a 3-bit type: 1, 2 and 3. A decoder that reads segments positionally instead of by type gets the OOB lists backwards here, and both are vendor lists with a maxId, so the mistake decodes into numbers that look right.',
			'The presence of vendorsAllowed depends on supportOOB and on the string being for vendors, neither of which is in the string. It is a property of how the string was produced, which means a decoder cannot tell an empty allowed list from a CMP that does not support out-of-band at all.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'Both vendor vectors in one core string, each with ids past the bitfield boundary, so the two encodings have to be read back to back.',
		id: 'tc-string-decode-vendor-li-wide',
		model: {
			purposeConsents: [1],
			vendorConsents: runOf(41, 7),
			vendorLegitimateInterests: [41, 42, 43, 44, 45, 46, 47, 60],
		},
		notes: [
			'The two vendor vectors are adjacent and independent, and each picks its own encoding, so this string can carry a range followed by a bitfield or the other way round. A decoder that reads the encoding type once per string rather than once per vector survives one of them and corrupts the other.',
		],
		population: 'decode-coverage',
	},
	{
		description:
			'A created timestamp a day behind lastUpdated, which is what a consent record looks like after it has been refreshed.',
		id: 'tc-string-decode-created-before-last-updated',
		model: { purposeConsents: [1, 7], vendorConsents: [1] },
		notes: [
			'Both timestamps are 36 bits of tenths of a second, so they survive to the decisecond and not below it; a confirmation time with a sub-de-second remainder is the one thing in a core segment that cannot round-trip exactly, which is why the fixture clock is a whole number of deciseconds. @c15t/iab always writes both fields from the same truncated day, so a decoder that assumes created equals lastUpdated passes every parity vector and fails this one.',
		],
		population: 'decode-coverage',
		timestamps: { created: 'day', lastUpdated: 'clock' },
	},
];

/** Resolve one case's timestamps against the frozen clock. */
const timestampsFor = function timestampsFor(
	now: number,
	timestamps: CaseSpec['timestamps']
): { created: number; lastUpdated: number } {
	const pick = function pick(which: 'created' | 'lastUpdated'): number {
		return (timestamps?.[which] ?? 'day') === 'clock'
			? now
			: c15tTimestamp(now);
	};
	return { created: pick('created'), lastUpdated: pick('lastUpdated') };
};

/** Turn one spec into a fixture, with the expectation read back out of the oracle. */
const buildTcStringCase = function buildTcStringCase(
	spec: CaseSpec,
	now: number,
	protocolVersion: number
): TcStringFixture {
	const vendorList = vendorListFor(spec.vendorList);
	const model = c15tModel(now, {
		...timestampsFor(now, spec.timestamps),
		...spec.model,
	});
	const encodingOptions: TcStringEncodeOptions = {
		isForVendors: spec.encodingOptions?.isForVendors ?? false,
		version: ENCODE_VERSION,
	};
	if (spec.population === 'parity') {
		assertParitySurface(spec.id, model, now);
	}

	const tcString = encodeTwice(vendorList, model, encodingOptions, spec.id);
	const segments = tcString.split('.');
	const segmentTypes = segments.map((segment) => segmentTypeOf(segment));
	// The string the fixture pins, read back by the same library that wrote it. This
	// is not a tautology: it is the only way to learn what the reference actually
	// preserves, which is the thing the native ports are being told they may lose.
	const fields = decodedFieldsOf(TCString.decode(tcString));

	if (model.version !== Number(fields.version)) {
		throw new Error(
			`${spec.id}: the reference decoded encoding version ${String(fields.version)} from a model that stated ${String(model.version)}. The pre-encoder rewrites version, so this file's default no longer describes what it emits.`
		);
	}

	return {
		description: spec.description,
		expected: {
			decode: { fields },
			encode: { segmentTypes, segments, tcString },
		},
		expects: EXPECTS[spec.population],
		id: spec.id,
		input: {
			encodingOptions,
			model,
			now,
			vendorList,
		},
		kind: 'tc-string',
		notes: [
			POPULATION_NOTES[spec.population],
			...spec.notes,
			...fidelityNotes(model, fields, segmentTypes),
		],
		oracle: { ...TC_STRING_ORACLE, encodeOptions: encodingOptions },
		population: spec.population,
		protocolVersion,
	};
};

/**
 * Build every `tc-string` fixture.
 *
 * Refuses the whole set rather than emitting a suspicious one when the install has
 * moved out from under the pinned oracle, when the clock cannot survive the reference's
 * own timestamp resolution, or when the reference's own vocabulary stops matching the
 * integers these fixtures carry.
 */
export const buildTcStringFixtures = function buildTcStringFixtures(
	now: number,
	protocolVersion: number
): TcStringFixture[] {
	const installed = installedOracleVersion();
	if (installed !== ORACLE_VERSION) {
		throw new Error(
			`@iabtechlabtcf/core is installed at ${installed} but these vectors are pinned to ${ORACLE_VERSION}. Every golden string in this kind came out of the pinned encoder, so a silent upgrade would relabel them as its work. Align packages/react-native/package.json before regenerating.`
		);
	}
	// The reference encodes a date as hundredths of a second. A clock with a
	// sub-de-second remainder would come back rounded, and the fixture would claim a
	// round trip it never made.
	if (!Number.isInteger(now) || now % 100 !== 0) {
		throw new Error(
			`The fixture clock (${String(now)}) is not a whole number of deciseconds, so the reference's 36-bit date fields cannot round-trip it. Pick a clock that divides by 100 rather than loosening the fidelity assertions.`
		);
	}
	// These fixtures carry wire integers, not the oracle's enum, so the two have to be
	// proved equal on every run instead of assumed from a reading of the source.
	const restrictionTypes = [
		RestrictionType.NOT_ALLOWED,
		RestrictionType.REQUIRE_CONSENT,
		RestrictionType.REQUIRE_LI,
	];
	if (
		restrictionTypes[0] !== RESTRICTION_TYPE.NOT_ALLOWED ||
		restrictionTypes[1] !== RESTRICTION_TYPE.REQUIRE_CONSENT ||
		restrictionTypes[2] !== RESTRICTION_TYPE.REQUIRE_LI
	) {
		throw new Error(
			`@iabtechlabtcf/core changed the RestrictionType wire values to ${restrictionTypes.join(', ')}, and every publisherRestrictions fixture here states the old ones.`
		);
	}
	if (
		SegmentIDs.ID_TO_KEY.length !== SEGMENT_NAMES.length ||
		SegmentIDs.ID_TO_KEY.some((key, index) => key !== SEGMENT_NAMES[index])
	) {
		throw new Error(
			`@iabtechlabtcf/core changed its segment ids to ${SegmentIDs.ID_TO_KEY.join(', ')}, and expected.encode.segmentTypes in these fixtures is documented against ${SEGMENT_NAMES.join(', ')}.`
		);
	}

	const ids = new Set<string>();
	for (const spec of CASE_SPECS) {
		if (ids.has(spec.id)) {
			throw new Error(`Duplicate tc-string fixture id: ${spec.id}`);
		}
		ids.add(spec.id);
		const prefix = POPULATION_PREFIXES[spec.population];
		if (!spec.id.startsWith(prefix)) {
			throw new Error(
				`${spec.id} is population=${spec.population} but does not start with "${prefix}". A runner that reaches for a vector by population has to be able to find one in the file name as well as the field, and a mismatched pair is how a decode-only vector ends up graded as an encoder test.`
			);
		}
	}

	return CASE_SPECS.map((spec) =>
		buildTcStringCase(spec, now, protocolVersion)
	);
};

/** Every `tc-string` fixture id, so a test can assert coverage without re-listing it. */
export const TC_STRING_FIXTURE_IDS: readonly string[] = CASE_SPECS.map(
	(spec) => spec.id
);
