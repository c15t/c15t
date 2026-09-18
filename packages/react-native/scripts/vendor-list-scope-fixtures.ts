/**
 * The `vendor-list-scope` fixture kind: a served vendor list plus a publisher's declared
 * vendor scope, and the narrowed document the web filter produced from the two.
 *
 * The oracle is `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts` -- the function
 * all four `createIAB` call sites route through -- and it is imported and called, never
 * paraphrased. Nothing in this file decides which vendor survives: every `expected` is the
 * object that function returned for `input`, so a native port that disagrees with these
 * bytes is disagreeing with the browser build rather than with a reading of it. The filter
 * is two lines of pruning, which is exactly why it earns a golden vector set. The pruning is
 * trivial and the two silences around it -- an empty scope that means no scope, and a scope
 * id the served list does not carry -- are both decisions a port can get wrong with every
 * test in the room nodding along.
 *
 * What every vector pins, by construction:
 *
 * - the surviving `vendors` keys and the order the web handed them back in
 *   (`expected.vendorKeys`), plus what each surviving entry states about itself
 *   (`expected.vendors`);
 * - the surviving entries verbatim, because "carried over" is not "rebuilt";
 * - every sibling of `vendors` verbatim -- purposes, specialPurposes, features,
 *   specialFeatures, stacks, dataCategories -- since a list narrowed to one vendor still has
 *   to say what purpose 7 is, and the per-vendor `legIntPurposes` list of each survivor;
 * - `vendorListVersion` and `tcfPolicyVersion`, which a TC String advertises and no
 *   publisher scope is entitled to move.
 *
 * The scope travels as `input.vendorIds`, and the absent case is a JSON `null` rather than a
 * missing key, because `nil` / `null` / `Nothing?` is how both cores receive it and a core
 * has to tell "no scope configured" from "a scope that is empty". Both answer with the whole
 * list, which is the fail-open half of the pair: a port that reads an empty scope as
 * "show nobody" empties a preference centre for a publisher who never scoped anything.
 */

import { narrowGVLToVendors } from '../../iab/src/tcf/fetch-gvl';
import type {
	GVLVendor,
	GlobalVendorList,
} from '../../iab/src/tcf/iab-tcf-types';

// -- The oracle -------------------------------------------------------------

/**
 * What produced these expectations, so a runner can name it in a failure.
 *
 * There is no third-party version to pin here the way `tc-string-fixtures.ts` pins
 * `@iabtechlabtcf/core`: this oracle is a workspace package that moves with the checkout, so
 * the honest provenance is the file and the function, and the proof that a runner read the
 * bytes this filter produced is the SHA-256 `index.json` carries for each file.
 */
export const VENDOR_LIST_SCOPE_ORACLE = {
	function: 'narrowGVLToVendors',
	module: 'packages/iab/src/tcf/fetch-gvl.ts',
	package: '@c15t/iab',
} as const;

/**
 * The largest scope the web puts in a GVL request line.
 *
 * `MAX_GVL_QUERY_VENDOR_IDS` in `packages/iab/src/tcf/fetch-gvl.ts`, and the same cap in
 * `packages/backend/src/http/gvl.ts`: at or below it the scope travels as a `?vendorIds=`
 * parameter and the endpoint filters; above it the document arrives whole and every caller
 * narrows it locally. Native cores inherit that crossover, so the kind keeps a vector on each
 * side of it. Stated as data because a vector has to be built past the number -- calling the
 * oracle is what makes an expectation true, not this constant.
 */
const MAX_QUERY_VENDOR_IDS = 500;

// -- The served document ----------------------------------------------------

/** Every vendor id the base document serves, in the order it serves them. */
const SERVED_VENDOR_IDS = [
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
	23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 43,
	45, 46, 62, 71, 77, 88, 97, 112, 141, 177, 353, 755, 897,
] as const;

/** The high-water id of the served document. */
const MAX_SERVED_VENDOR_ID = Math.max(...SERVED_VENDOR_IDS);

/**
 * Served keys whose entry states somebody else's number in its own body.
 *
 * Two records carry each other's id: the one keyed `7` states `id: 11`, the one keyed `11`
 * states `id: 7`. Adjacent and plausible on purpose, because an adjacent pair is what makes a
 * filter that read bodies disclose the next vendor in the drawer rather than something
 * obviously nonsense.
 */
const PLANTED_BODY_IDS: Record<number, number> = { 7: 11, 11: 7 };

/** A short purpose record. The long copy is what a drawer renders, not what a filter reads. */
const definition = function definition(
	id: number,
	name: string,
	legal: boolean
): {
	description: string;
	descriptionLegal?: string;
	id: number;
	illustrations: string[];
	name: string;
} {
	return {
		description: `Purpose ${String(id)} operates on device data.`,
		...(legal
			? { descriptionLegal: `Legal text for purpose ${String(id)}.` }
			: undefined),
		id,
		illustrations: [],
		name,
	};
};

/**
 * One served vendor entry, in `gvlVendorSchema`'s names and no richer than it has to be.
 *
 * Four of them carry the optional half of the schema -- `dataCategories`, `dataRetention`,
 * `overflow`, `deviceStorageDisclosureUrl`, a `deletedDate` -- so a survivor that drops an
 * optional field on its way through a prune cannot pass the run.
 */
const vendor = function vendor(id: number): GVLVendor {
	return {
		cookieMaxAgeSeconds: id % 2 === 0 ? 34_128_000 : null,
		cookieRefresh: false,
		...(id === 8 || id === 45
			? {
					dataCategories: [1, 9],
					dataRetention: {
						purposes: { '1': 13 },
						stdRetention: 34_128_000,
					},
				}
			: undefined),
		...(id === 755 ? { deletedDate: '2025-08-01T00:00:00Z' } : undefined),
		...(id === 43
			? { deviceStorageDisclosureUrl: 'https://v43.test/storage.json' }
			: undefined),
		features: id % 3 === 0 ? [1] : [],
		flexiblePurposes: id % 5 === 0 ? [2] : [],
		id,
		legIntPurposes: id % 4 === 0 ? [2, 4] : [4],
		name: `Vendor ${String(id)}`,
		...(id === 62 ? { overflow: { httpGetLimit: 8 } } : undefined),
		purposes: id % 2 === 0 ? [1, 3, 7] : [1, 7],
		specialFeatures: id % 7 === 0 ? [2] : [],
		specialPurposes: [1],
		urls: [{ langId: 'EN', privacy: `https://v${String(id)}.test/privacy` }],
		usesCookies: true,
		usesNonCookieAccess: id % 11 === 0,
	};
};

/**
 * The document every vector starts from.
 *
 * Built in a fixed key order so two runs write the same bytes. `vendors` is built from ids
 * already in ascending order, and JavaScript hands integer-like keys back in ascending
 * numeric order regardless, so `narrowGVLToVendors` returns served order and a runner can
 * compare against the order the fixture states rather than a sort of its own choosing.
 */
const servedDocument = function servedDocument(): GlobalVendorList {
	const vendors: GlobalVendorList['vendors'] = {};
	for (const id of SERVED_VENDOR_IDS) {
		const entry = vendor(id);
		const planted = PLANTED_BODY_IDS[id];
		vendors[String(id)] =
			planted === undefined ? entry : { ...entry, id: planted };
	}
	return {
		dataCategories: {
			'1': {
				description: 'Cookie identifiers.',
				id: 1,
				name: 'Cookies and other identifiers',
			},
			'9': {
				description: 'Precise location.',
				id: 9,
				name: 'Precise location data',
			},
		},
		features: {
			'1': definition(1, 'Identify devices based on information', false),
			'2': definition(2, 'Link to other activities', false),
			'3': definition(3, 'Receive and use information', false),
		},
		gvlSpecificationVersion: 4,
		lastUpdated: '2025-11-01T00:00:00Z',
		purposes: {
			'1': definition(1, 'Store and/or access information on a device', true),
			'3': definition(3, 'Personalise content', false),
			'4': definition(4, 'Use limited data to select advertising', true),
			'7': definition(7, 'Measure performance', false),
		},
		specialFeatures: {
			'1': definition(1, 'Use precise geolocation data', false),
			'2': definition(2, 'Actively scan device characteristics', false),
		},
		specialPurposes: {
			'1': definition(1, 'Ensure security, prevent and detect fraud', false),
			'2': definition(2, 'Deliver and present advertising', false),
		},
		stacks: {
			'40': {
				description: 'Personalise content, measure performance',
				id: 40,
				name: 'Content measurement packet',
				purposes: [3, 7],
				specialFeatures: [2],
			},
			'41': {
				description: 'Limited advertising data',
				id: 41,
				name: 'Advertising packet',
				purposes: [4],
				specialFeatures: [1],
			},
		},
		tcfPolicyVersion: 5,
		vendorListVersion: 177,
		vendors,
	};
};

/** A copy of the base document whose two version numbers are nobody's defaults. */
const renumberedDocument = function renumberedDocument(): GlobalVendorList {
	return { ...servedDocument(), tcfPolicyVersion: 4, vendorListVersion: 431 };
};

// -- Cases ------------------------------------------------------------------

/** The nine cases this kind covers, in the order a runner reads them. */
export const VENDOR_LIST_SCOPE_SHAPES = [
	'scope-32-vendors',
	'scope-empty',
	'scope-absent',
	'scope-unknown-id',
	'scope-wider-than-list',
	'scope-above-query-cap',
	'scope-key-not-body-id',
	'scope-siblings-preserved',
	'scope-versions-preserved',
] as const;

export type VendorListScopeShape = (typeof VENDOR_LIST_SCOPE_SHAPES)[number];

/** The 32 partners one publisher declared, all of them served by the base document. */
const THIRTY_TWO_VENDOR_SCOPE = [
	1, 4, 5, 7, 8, 9, 12, 14, 15, 17, 20, 21, 22, 24, 25, 28, 32, 33, 35, 36, 40,
	43, 45, 46, 62, 71, 77, 88, 97, 112, 177, 755,
] as const;

interface VendorListScopeCase {
	description: string;
	/** The scope as the web receives it. `null` is the absent case. */
	scope: readonly number[] | null;
	shape: VendorListScopeShape;
	/** The document the scope is applied to; defaults to {@link servedDocument}. */
	document?: GlobalVendorList;
}

const CASE_SPECS: readonly VendorListScopeCase[] = [
	{
		description:
			'A publisher that declared 32 partners keeps 32 of the 54 the served list carries, and the other 22 never reach the device.',
		scope: [...THIRTY_TWO_VENDOR_SCOPE],
		shape: 'scope-32-vendors',
	},
	{
		description:
			'An empty scope means no scope was configured, not show nobody, so the served list comes back with every vendor on it.',
		scope: [],
		shape: 'scope-empty',
	},
	{
		description:
			'A scope that was never configured arrives as null, and the served list is handed back whole the way the empty scope has it.',
		scope: null,
		shape: 'scope-absent',
	},
	{
		description:
			'Two of the three scope ids name vendors the served list does not carry, and neither buys an entry: the answer is the one served entry and nothing else.',
		scope: [11, 1_000_483, 66_001],
		shape: 'scope-unknown-id',
	},
	{
		description:
			'A scope wider than the served list keeps what the list happens to carry, a withdrawn vendor included, and the ids past the last assignment contribute nothing.',
		scope: Array.from(
			{ length: MAX_SERVED_VENDOR_ID + 50 },
			(_unused, index) => index + 1
		),
		shape: 'scope-wider-than-list',
	},
	{
		description:
			'A scope of 609 ids sits past the 500-id cap the web is willing to put in a request line, which is the case where the document arrives whole and gets narrowed here. Only 52 of the 54 served ids fall inside the scope, so the two past the marker drop out on their own.',
		scope: Array.from(
			{ length: MAX_QUERY_VENDOR_IDS + 109 },
			(_unused, index) => index + 1
		),
		shape: 'scope-above-query-cap',
	},
	{
		description:
			'Two planted records state a number that is not the key they are served under, and selection follows the keys: a scope naming 7 keeps the record keyed 7, which states 11 in its body, and drops the record keyed 11, which states 7. A filter that consulted bodies would return the opposite pair.',
		scope: [7],
		shape: 'scope-key-not-body-id',
	},
	{
		description:
			'A scope of five ids keeps four vendors, and the framework half of the document comes back exactly as it arrived: purposes, specialPurposes, features, specialFeatures, stacks and dataCategories, with each survivor carrying its own legIntPurposes and flexiblePurposes lists untouched.',
		scope: [4, 8, 45, 62, 897],
		shape: 'scope-siblings-preserved',
	},
	{
		description:
			'A narrow scope on a list numbered 431 under policy 4 keeps both version numbers, because the TC String a device encodes advertises them and no publisher scope may move them.',
		document: renumberedDocument(),
		scope: [43, 62],
		shape: 'scope-versions-preserved',
	},
] as const;

// -- Fixtures ---------------------------------------------------------------

/**
 * One surviving vendor, as the filter's own output describes it.
 *
 * The narrowest transcript that still says what a survivor is. `bodyId` is read out of the
 * web's return value, so `bodyIdDiffersFromKey` records the served document's disagreement
 * rather than asserting it, and a runner can see from `carriesOptionalFields` whether an entry
 * that lost its `dataRetention` ought to fail.
 */
interface SurvivingVendor {
	/** The id this entry states in its own body, which the filter never consults. */
	bodyId: number | null;
	/** Whether the entry states an id other than the key it is served under. */
	bodyIdDiffersFromKey: boolean;
	/** Whether any optional half of `gvlVendorSchema` is present on the returned entry. */
	carriesOptionalFields: boolean;
	key: number;
	name: string | null;
}

const survivingVendors = function survivingVendors(
	narrowed: GlobalVendorList,
	vendorKeys: readonly string[]
): SurvivingVendor[] {
	return vendorKeys.map((key) => {
		const entry = narrowed.vendors[key];
		return {
			bodyId: entry?.id ?? null,
			bodyIdDiffersFromKey: entry === undefined || entry.id !== Number(key),
			carriesOptionalFields:
				entry?.dataCategories !== undefined ||
				entry?.dataRetention !== undefined ||
				entry?.overflow !== undefined ||
				entry?.deletedDate !== undefined ||
				entry?.deviceStorageDisclosureUrl !== undefined,
			key: Number(key),
			name: entry?.name ?? null,
		};
	});
};

export interface VendorListScopeFixture {
	protocolVersion: number;
	kind: 'vendor-list-scope';
	id: string;
	description: string;
	notes: string[];
	/** Which of the nine cases this vector is, so a runner branches on data, not on an id. */
	shape: VendorListScopeShape;
	oracle: typeof VENDOR_LIST_SCOPE_ORACLE;
	input: {
		/** The document as the endpoint or the backend served it, before any scope ran. */
		document: GlobalVendorList;
		/** How many ids the scope names, so a runner can name the cap in a failure. */
		scopeSize: number;
		/** The publisher's declared scope. `null` is a deployment that declared none. */
		vendorIds: readonly number[] | null;
	};
	expected: {
		/** The exact document `narrowGVLToVendors` returned for `input`. */
		document: GlobalVendorList;
		/** Whether the filter returned the document it was handed rather than a copy. */
		unchanged: boolean;
		/** The surviving `vendors` keys, in the order the web handed them back. */
		vendorKeys: string[];
		/** {@link VendorListScopeFixture.expected.vendorKeys} paired with each entry's own claim. */
		vendors: SurvivingVendor[];
	};
}

const idFor = function idFor(shape: VendorListScopeShape): string {
	return `vendor-list-scope-${shape.replace('scope-', '')}`;
};

const buildCase = function buildCase(
	spec: VendorListScopeCase,
	protocolVersion: number
): VendorListScopeFixture {
	const document = spec.document ?? servedDocument();
	const scope = spec.scope;
	// The oracle, called. Everything under `expected` is its return value; the derivation
	// below reads that value back and never recomputes it.
	//
	// An absent scope has no web call to copy, because the web never reaches the filter with
	// one: all four `narrowGVLToVendors` sites in `packages/iab/src/index.ts` guard on
	// `vendors?.length` first, so a deployment that declared no scope and one that declared an
	// empty scope take the same branch and the served document travels untouched. `[]` is
	// therefore the argument the web's own absent path hands the filter, which pins the web's
	// behaviour rather than this file's guess about it.
	const narrowed = narrowGVLToVendors(document, scope ?? []);
	const vendorKeys = Object.keys(narrowed.vendors);

	return {
		description: spec.description,
		expected: {
			document: narrowed,
			unchanged: narrowed === document,
			vendorKeys,
			vendors: survivingVendors(narrowed, vendorKeys),
		},
		id: idFor(spec.shape),
		input: {
			document,
			scopeSize: scope?.length ?? 0,
			vendorIds: scope,
		},
		kind: 'vendor-list-scope',
		notes: [
			`expected.document is what narrowGVLToVendors in ${VENDOR_LIST_SCOPE_ORACLE.module} returned for this input: called, not restated.`,
			'vendorKeys is the surviving vendors keys in the order the web returned them, which is served order and not the order a host typed the scope in.',
			scope === null || scope.length === 0
				? 'No scope is declared here, so the whole document is expected back. A core that reads this as show-nobody has emptied a drawer nobody asked it to empty.'
				: 'Nothing in expected is invented: an id the served document does not carry contributes no entry, and a survivor arrives with its optional fields attached.',
		],
		oracle: VENDOR_LIST_SCOPE_ORACLE,
		protocolVersion,
		shape: spec.shape,
	};
};

/**
 * Build every `vendor-list-scope` fixture.
 *
 * Refuses the set rather than emitting a suspicious one. The nine cases all have to be
 * present, the ids have to be distinct and named after the kind, and the vectors that exist to
 * sit on either side of the request-line cap have to actually sit on either side of it. Those
 * are claims about the set, and a set that quietly loses one is the exact failure mode this
 * kind exists to prevent.
 */
export const buildVendorListScopeFixtures =
	function buildVendorListScopeFixtures(
		protocolVersion: number
	): VendorListScopeFixture[] {
		if (typeof narrowGVLToVendors !== 'function') {
			throw new Error(
				`narrowGVLToVendors is not exported from ${VENDOR_LIST_SCOPE_ORACLE.module}, so this kind has no oracle left to call. Move the function rather than writing a second one here -- two filters is two answers.`
			);
		}

		const shapes = new Set<string>();
		for (const spec of CASE_SPECS) {
			if (shapes.has(spec.shape)) {
				throw new Error(`Duplicate vendor-list-scope shape: ${spec.shape}`);
			}
			shapes.add(spec.shape);
			const id = idFor(spec.shape);
			if (!id.startsWith('vendor-list-scope-')) {
				throw new Error(
					`${id} does not start with "vendor-list-scope-". A runner reaches for a vector by kind, and the file name has to agree with the index entry.`
				);
			}
		}
		for (const shape of VENDOR_LIST_SCOPE_SHAPES) {
			if (!shapes.has(shape)) {
				throw new Error(
					`The vendor-list-scope case set dropped ${shape}. Every shape listed here is a claim a native core is graded on, so deleting one is claims going ungraded rather than a test getting easier.`
				);
			}
		}

		const byShape = new Map(CASE_SPECS.map((spec) => [spec.shape, spec]));
		const pastCap = byShape.get('scope-above-query-cap');
		const wider = byShape.get('scope-wider-than-list');
		const declared = byShape.get('scope-32-vendors');
		if (!pastCap || (pastCap.scope?.length ?? 0) <= MAX_QUERY_VENDOR_IDS) {
			throw new Error(
				`scope-above-query-cap names ${String(pastCap?.scope?.length ?? 0)} ids, which the web still puts on the request line. The point of the vector is that it cannot go there, so it has to sit past ${String(MAX_QUERY_VENDOR_IDS)}.`
			);
		}
		if (!wider || (wider.scope?.length ?? 0) < MAX_SERVED_VENDOR_ID) {
			throw new Error(
				`scope-wider-than-list has to reach past the last id the served document assigns (${String(MAX_SERVED_VENDOR_ID)}), or it is the cap vector again under a different name.`
			);
		}
		if (
			!declared ||
			declared.scope?.length !== THIRTY_TWO_VENDOR_SCOPE.length
		) {
			throw new Error(
				`scope-32-vendors has to declare exactly ${String(THIRTY_TWO_VENDOR_SCOPE.length)} ids. The publisher that scoped its partners is the publisher this kind was written for.`
			);
		}

		return CASE_SPECS.map((spec) => buildCase(spec, protocolVersion));
	};

/** Every `vendor-list-scope` fixture id, so a test can assert coverage without re-listing it. */
export const VENDOR_LIST_SCOPE_FIXTURE_IDS: readonly string[] = CASE_SPECS.map(
	(spec) => idFor(spec.shape)
);
