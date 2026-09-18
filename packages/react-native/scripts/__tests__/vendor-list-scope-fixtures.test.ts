/**
 * Proves the committed `vendor-list-scope` fixtures say what they claim.
 *
 * Every test here reads the checked-in JSON and drives `narrowGVLToVendors` again from
 * `fixture.input` alone, the way `tc-string-fixtures.test.ts` drives the reference codec.
 * The generator calls that function too, so a second run from the published side is the
 * assertion that matters: a vector whose `expected` survives it is the web's answer written
 * down, not a transcription of whatever the builder produced on the day it was generated.
 * It is also the only reproduction either native core can manage -- Swift and Kotlin get
 * these bytes and nothing else -- so a fixture that only its own generator could reproduce
 * would read green here and be graded wrong on a device.
 *
 * The SHA-256 in `index.json` is checked against the bytes rather than against a
 * re-serialization, because both native loaders hash before they parse for the same reason:
 * an edited file still parses, and a reader that parsed first would grade the core against
 * somebody else's keystrokes.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { narrowGVLToVendors } from '../../../iab/src/tcf/fetch-gvl';
import type { GlobalVendorList } from '../../../iab/src/tcf/iab-tcf-types';
import {
	VENDOR_LIST_SCOPE_FIXTURE_IDS,
	VENDOR_LIST_SCOPE_ORACLE,
	VENDOR_LIST_SCOPE_SHAPES,
} from '../vendor-list-scope-fixtures';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(HERE, '../../../../native/protocol');
const INDEX_FILE = 'index.json';
const KIND = 'vendor-list-scope';

/** The optional halves of `gvlVendorSchema`, which a rebuilt entry is likeliest to lose. */
const OPTIONAL_VENDOR_FIELDS = [
	'dataCategories',
	'dataRetention',
	'deletedDate',
	'deviceStorageDisclosureUrl',
	'overflow',
] as const;

/** Everything beside `vendors`, plus the two versions a TC String advertises. */
const FRAMEWORK_FIELDS = [
	'dataCategories',
	'features',
	'gvlSpecificationVersion',
	'lastUpdated',
	'purposes',
	'specialFeatures',
	'specialPurposes',
	'stacks',
	'vendorListVersion',
	'tcfPolicyVersion',
] as const;

/** The vendor list as published: id-keyed records whose keys are strings on the wire. */
type VendorRecords = Record<string, Record<string, unknown> | undefined>;

interface IndexEntry {
	bytes: number;
	file: string;
	id: string;
	kind: string;
	protocolVersion: number;
	sha256: string;
}

interface PublishedFixture {
	description: string;
	expected: {
		document: GlobalVendorList;
		unchanged: boolean;
		vendorKeys: string[];
		vendors: {
			bodyId: number | null;
			bodyIdDiffersFromKey: boolean;
			carriesOptionalFields: boolean;
			key: number;
			name: string | null;
		}[];
	};
	id: string;
	input: {
		document: GlobalVendorList;
		scopeSize: number;
		vendorIds: number[] | null;
	};
	kind: typeof KIND;
	notes: string[];
	oracle: typeof VENDOR_LIST_SCOPE_ORACLE;
	protocolVersion: number;
	shape: (typeof VENDOR_LIST_SCOPE_SHAPES)[number];
}

const recordsOf = function recordsOf(
	document: GlobalVendorList
): VendorRecords {
	return document.vendors as unknown as VendorRecords;
};

const entries = (
	JSON.parse(readFileSync(resolve(FIXTURE_DIR, INDEX_FILE), 'utf8')) as {
		fixtures: IndexEntry[];
	}
).fixtures.filter((entry) => entry.kind === KIND);

const fixtures = entries.map((entry) => {
	return JSON.parse(
		readFileSync(resolve(FIXTURE_DIR, entry.file), 'utf8')
	) as PublishedFixture;
});

const vectorFor = function vectorFor(
	shape: PublishedFixture['shape']
): PublishedFixture {
	const found = fixtures.find((fixture) => fixture.shape === shape);
	if (!found) {
		throw new Error(
			`no committed ${KIND} vector has shape ${shape}; the case set lost one`
		);
	}
	return found;
};

/** A survivor transcript rebuilt from the document it is claimed about. */
const survivingFrom = function survivingFrom(
	document: GlobalVendorList,
	vendorKeys: readonly string[]
) {
	const records = recordsOf(document);
	return vendorKeys.map((key) => {
		const entry = records[key];
		return {
			bodyId: (entry?.id as number | undefined) ?? null,
			bodyIdDiffersFromKey: entry === undefined || entry.id !== Number(key),
			carriesOptionalFields: OPTIONAL_VENDOR_FIELDS.some(
				(field) => entry?.[field] !== undefined
			),
			key: Number(key),
			name: (entry?.name as string | undefined) ?? null,
		};
	});
};

describe(`${KIND} fixtures`, () => {
	test('the index pins every vector, and the bytes on disk are the pinned ones', () => {
		expect(entries.map((entry) => entry.id)).toEqual([
			...VENDOR_LIST_SCOPE_FIXTURE_IDS,
		]);
		for (const entry of entries) {
			const bytes = readFileSync(resolve(FIXTURE_DIR, entry.file));
			expect(bytes.byteLength).toBe(entry.bytes);
			expect(createHash('sha256').update(bytes).digest('hex')).toBe(
				entry.sha256
			);
			expect(entry.file).toBe(`${entry.id}.json`);
			expect(entry.id.startsWith(`${KIND}-`)).toBe(true);
			expect(entry.protocolVersion).toBe(1);
		}
	});

	test('every case is published exactly once and describes itself', () => {
		expect(fixtures.length).toBe(VENDOR_LIST_SCOPE_SHAPES.length);
		expect(fixtures.map((fixture) => fixture.shape).sort()).toEqual(
			[...VENDOR_LIST_SCOPE_SHAPES].sort()
		);
		for (const fixture of fixtures) {
			expect(fixture.kind).toBe(KIND);
			// The provenance a runner quotes when it disagrees with a vector.
			expect(fixture.oracle).toStrictEqual(VENDOR_LIST_SCOPE_ORACLE);
			expect(fixture.description.length).toBeGreaterThan(30);
			expect(fixture.notes.length).toBeGreaterThan(0);
			// The three views of the same answer have to agree with each other before any
			// core is graded against them.
			expect(fixture.expected.vendorKeys).toEqual(
				Object.keys(fixture.expected.document.vendors)
			);
			expect(fixture.expected.vendors.map((vendor) => vendor.key)).toEqual(
				fixture.expected.vendorKeys.map((key) => Number(key))
			);
			expect(
				survivingFrom(fixture.expected.document, fixture.expected.vendorKeys)
			).toEqual(fixture.expected.vendors);
			expect(fixture.input.scopeSize).toBe(
				fixture.input.vendorIds?.length ?? 0
			);
		}
	});

	/**
	 * The load-bearing test: every published `input` goes back through the web filter, and
	 * what comes back has to be the published `expected`.
	 *
	 * Object identity is asserted rather than inferred, because `unchanged` claims exactly
	 * that: the filter handed the document back rather than rebuilding a copy that looks
	 * the same. A deep equality alone would let an eager copy satisfy a vector that was
	 * graded as untouched, which is the difference the two no-scope cases exist to pin.
	 */
	test('each expectation is the filter run again on the published input', () => {
		for (const fixture of fixtures) {
			const returned = narrowGVLToVendors(
				fixture.input.document,
				fixture.input.vendorIds ?? []
			);
			expect(returned === fixture.input.document).toBe(
				fixture.expected.unchanged
			);
			expect(returned).toStrictEqual(fixture.expected.document);
			expect(Object.keys(returned.vendors)).toEqual(
				fixture.expected.vendorKeys
			);
		}
	});

	/**
	 * The nine cases, as outcomes. Every count in the set above would still pass with a
	 * filter that fabricated an entry, emptied a drawer nobody scoped, or read a body id, so
	 * each of these names a mistake the counts cannot see.
	 */
	test('each case lands where the disclosure promise says it must', () => {
		// A publisher that declared 32 partners keeps 32, and not one of them is invented.
		const declared = vectorFor('scope-32-vendors');
		expect(declared.input.vendorIds).toHaveLength(32);
		expect(declared.expected.vendorKeys).toHaveLength(32);
		expect(new Set(declared.expected.vendorKeys).size).toBe(32);

		// An empty scope and an absent one both mean nobody scoped anything, so the served
		// list travels whole. An emptied drawer is a refusal the publisher never configured.
		const servedKeys = Object.keys(
			vectorFor('scope-empty').input.document.vendors
		);
		expect(servedKeys).toHaveLength(54);
		// Both documents cross a JSON boundary on their way into this test, so "handed back
		// untouched" is not observable between them -- the re-run above is where `unchanged`
		// gets its teeth. What these two files can show is that the whole document travels.
		for (const shape of ['scope-absent', 'scope-empty'] as const) {
			const fixture = vectorFor(shape);
			expect(fixture.expected.unchanged).toBe(true);
			expect(fixture.expected.document).toStrictEqual(fixture.input.document);
			expect(fixture.expected.vendorKeys).toEqual(servedKeys);
		}
		// Absent is a JSON null and not a missing key: a core has to tell "no scope
		// configured" from "a scope that is empty" even though both answer with the whole
		// list, and `nil` / `null` / `Nothing?` is how both cores receive it.
		expect(vectorFor('scope-absent').input.vendorIds).toBeNull();
		expect(vectorFor('scope-empty').input.vendorIds).toEqual([]);

		// Two of the three ids name nobody. The answer is one vendor out of three, which no
		// count of a declared scope can show -- and an invented entry would put a name on the
		// drawer that no GVL revision stands behind.
		const unknown = vectorFor('scope-unknown-id');
		expect(unknown.input.vendorIds).toEqual([11, 1_000_483, 66_001]);
		expect(unknown.expected.vendorKeys).toEqual(['11']);
		for (const unserved of ['1000483', '66001']) {
			expect(recordsOf(unknown.input.document)[unserved]).toBeUndefined();
			expect(recordsOf(unknown.expected.document)[unserved]).toBeUndefined();
		}

		// Past the last id the framework assigned, a wide scope lands on the served list and
		// adds nothing. It is still a rebuilt document rather than the one handed in, which is
		// why the promise here is "every served vendor survives" and not "untouched".
		const wider = vectorFor('scope-wider-than-list');
		expect(wider.input.scopeSize).toBeGreaterThan(servedKeys.length);
		expect(wider.expected.unchanged).toBe(false);
		expect(wider.expected.vendorKeys).toEqual(servedKeys);

		// Above the 500-id cap the web will put in a request line, the scope cannot travel as a
		// `vendorIds` parameter, so this is the case where the document arrives whole and every
		// caller prunes it itself. The scope names 1..609 and reaches past two served ids, which
		// are dropped exactly like every other id outside it.
		const cap = vectorFor('scope-above-query-cap');
		const capReach = Math.max(...(cap.input.vendorIds ?? []));
		expect(cap.input.scopeSize).toBeGreaterThan(500);
		expect(cap.input.scopeSize).toBe(capReach);
		expect(cap.expected.vendorKeys).toEqual(
			servedKeys.filter((key) => Number(key) <= capReach)
		);
		expect(cap.expected.vendorKeys).not.toContain('755');
		expect(cap.expected.vendorKeys).not.toContain('897');
		expect(cap.expected.vendorKeys).toContain('353');

		// The served pair keyed 7 / 11 states 11 / 7 in its bodies, so a filter that consulted
		// bodies would keep the opposite entry for the same scope and still hand back exactly
		// one vendor. Selection follows the key: key 7 survives, with the served body intact.
		const keyed = vectorFor('scope-key-not-body-id');
		expect(keyed.input.vendorIds).toEqual([7]);
		expect(keyed.expected.vendorKeys).toEqual(['7']);
		expect(recordsOf(keyed.input.document)['7']?.id).toBe(11);
		expect(recordsOf(keyed.input.document)['11']?.id).toBe(7);
		expect(recordsOf(keyed.expected.document)['7']).toStrictEqual(
			recordsOf(keyed.input.document)['7']
		);
		expect(keyed.expected.vendors[0]?.bodyIdDiffersFromKey).toBe(true);
		expect(keyed.expected.document.vendors['11']).toBeUndefined();

		// Survivors keep served order, which is the order the document was pruned in and not
		// the order a host typed the scope. The ids here arrive out of order on purpose.
		const ordered = vectorFor('scope-siblings-preserved');
		expect(ordered.input.vendorIds).toEqual([4, 8, 45, 62, 897]);
		expect(ordered.expected.vendorKeys).toEqual(['4', '8', '45', '62', '897']);

		// The TC String a device encodes advertises both version numbers, so a scope of two
		// ids on a list numbered away from every default has to bring both back.
		const versions = vectorFor('scope-versions-preserved');
		expect(versions.input.document.vendorListVersion).toBe(431);
		expect(versions.input.document.tcfPolicyVersion).toBe(4);
		expect(versions.expected.document.vendorListVersion).toBe(431);
		expect(versions.expected.document.tcfPolicyVersion).toBe(4);
		expect(versions.expected.vendorKeys).toEqual(['43', '62']);
		// Only this vector is renumbered, or the two numbers above would say as much about a
		// builder's defaults as about a served document.
		expect(
			fixtures
				.filter((fixture) => fixture !== versions)
				.every(
					(fixture) =>
						fixture.input.document.vendorListVersion === 177 &&
						fixture.input.document.tcfPolicyVersion === 5
				)
		).toBe(true);
	});

	test('nothing is invented, and every survivor is carried rather than rebuilt', () => {
		for (const fixture of fixtures) {
			const served = recordsOf(fixture.input.document);
			const expected = recordsOf(fixture.expected.document);
			expect(Object.keys(served).length).toBeGreaterThan(0);
			for (const [key, entry] of Object.entries(expected)) {
				// A key with no served record has no entry to survive, so a survivor that
				// reads as undefined here is a fabricated vendor.
				expect(served[key], key).toBeDefined();
				// "Carried over" and not "rebuilt": the entry that survives is the served
				// record, optional fields and all.
				expect(entry, key).toStrictEqual(served[key]);
			}
			// A prune removes records and nothing else, so a key outside the survivor set has
			// to be absent rather than present under repaired bytes.
			const survivors = new Set(fixture.expected.vendorKeys);
			for (const key of Object.keys(served)) {
				if (!survivors.has(key)) {
					expect(expected[key], key).toBeUndefined();
				}
			}
		}
	});

	test('the records beside vendors come back verbatim', () => {
		for (const fixture of fixtures) {
			const served = fixture.input.document as unknown as Record<
				string,
				unknown
			>;
			const expected = fixture.expected.document as unknown as Record<
				string,
				unknown
			>;
			// The framework half has to be populated, or "identical" would be comparing
			// nothing and a pruned `purposes` record would still read clean.
			expect(Object.keys(served.purposes as object).length).toBeGreaterThan(0);
			for (const field of FRAMEWORK_FIELDS) {
				expect(expected[field], field).toStrictEqual(served[field]);
			}
		}
	});
});
