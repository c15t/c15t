/**
 * Proves the committed `tc-string` fixtures say what they claim.
 *
 * Every test here reads the checked-in JSON and drives `@iabtechlabtcf/core` again
 * from `fixture.input` alone. It deliberately does not call the builder's own
 * plumbing, because the property that matters is not "the generator agrees with
 * itself" -- it is "a fixture file carries enough to reproduce its expectation from
 * scratch", which is exactly what a Swift or Kotlin lane has to do with no access to
 * this code. A fixture that only its own generator can reproduce is not a golden
 * vector, it is a snapshot.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	GVL,
	PurposeRestriction,
	TCModel,
	TCString,
} from '@iabtechlabtcf/core';
import type { VendorList } from '@iabtechlabtcf/core';
import { describe, expect, test } from 'vitest';

import {
	buildTcStringFixtures,
	TC_STRING_FIXTURE_IDS,
	TC_STRING_ORACLE,
} from '../tc-string-fixtures';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(HERE, '../../../../native/protocol');

interface FixtureVendor {
	features: number[];
	flexiblePurposes: number[];
	id: number;
	legIntPurposes: number[];
	purposes: number[];
	specialFeatures: number[];
	specialPurposes: number[];
}

interface FixtureModel {
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
	publisherRestrictions: {
		purposeId: number;
		restrictionType: number;
		vendorIds: number[];
	}[];
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

interface TcStringFixtureFile {
	expected: {
		decode: { fields: Record<string, unknown> };
		encode: { segmentTypes: number[]; segments: string[]; tcString: string };
	};
	expects: { decode: boolean; encode: boolean };
	id: string;
	input: {
		encodingOptions: { isForVendors: boolean; version: 2 };
		model: FixtureModel;
		now: number;
		vendorList: {
			language: string;
			tcfPolicyVersion: number;
			vendorListVersion: number;
			vendors: FixtureVendor[];
		};
	};
	notes: string[];
	population: 'decode-coverage' | 'parity';
	protocolVersion: number;
}

const INDEX_FILE = 'index.json';

const readIndex = function readIndex(): {
	clock: number;
	fixtures: { file: string; kind: string }[];
	protocolVersion: number;
} {
	return JSON.parse(
		readFileSync(resolve(FIXTURE_DIR, INDEX_FILE), 'utf8')
	) as ReturnType<typeof readIndex>;
};

const readTcStringFixtures =
	function readTcStringFixtures(): TcStringFixtureFile[] {
		return readIndex()
			.fixtures.filter((entry) => entry.kind === 'tc-string')
			.map(
				(entry) =>
					JSON.parse(
						readFileSync(resolve(FIXTURE_DIR, entry.file), 'utf8')
					) as TcStringFixtureFile
			);
	};

const FIXTURES = readTcStringFixtures();

/**
 * Rebuild a `TCModel` from the fixture's own `input`, the way a native encoder would
 * be handed it. This is the second implementation of the input format on purpose: if a
 * field in `input` were decorative, it would go unread here and the encode assertion
 * below would fail against the pinned string.
 */
const modelFromInput = function modelFromInput(
	fixture: TcStringFixtureFile
): TCModel {
	const { model, vendorList } = fixture.input;
	const vendors: Record<string, unknown> = {};
	for (const vendor of vendorList.vendors) {
		vendors[String(vendor.id)] = { ...vendor };
	}
	const purposes: Record<string, unknown> = {};
	for (const vendor of vendorList.vendors) {
		for (const purposeId of vendor.purposes) {
			purposes[String(purposeId)] = {
				description: `Purpose ${String(purposeId)}.`,
				id: purposeId,
				name: `Purpose ${String(purposeId)}`,
			};
		}
	}
	// The language a CMP loaded the list in is a construction option rather than a
	// field of the list JSON, and the reference overwrites the model's consent
	// language with it. Omit it here and every vector silently re-encodes as EN.
	const gvl = new GVL(
		{
			dataCategories: {},
			features: {},
			gvlSpecificationVersion: 3,
			lastUpdated: '2026-02-02T00:00:00Z',
			purposes,
			specialFeatures: {},
			specialPurposes: {},
			stacks: {},
			tcfPolicyVersion: vendorList.tcfPolicyVersion,
			vendorListVersion: vendorList.vendorListVersion,
			vendors,
		} as VendorList,
		{ language: vendorList.language }
	);

	const tcModel = new TCModel(gvl);
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
		const pr = new PurposeRestriction(
			restriction.purposeId,
			restriction.restrictionType
		);
		for (const vendorId of restriction.vendorIds) {
			tcModel.publisherRestrictions.add(vendorId, pr);
		}
	}
	return tcModel;
};

/** The same read-back the generator performs, reimplemented here. */
const fieldsFrom = function fieldsFrom(
	decoded: TCModel
): Record<string, unknown> {
	const ids = (vector: { values: () => IterableIterator<number> }) =>
		[...new Set(vector.values())].sort((a, b) => a - b);
	const purposes = decoded.publisherRestrictions
		.getPurposes()
		.sort((a, b) => a - b);
	const vendors = [...new Set(decoded.publisherRestrictions.getVendors())].sort(
		(a, b) => a - b
	);
	const grouped = new Map<string, Record<string, unknown>>();
	for (const purposeId of purposes) {
		for (const vendorId of vendors) {
			const restrictionType = decoded.publisherRestrictions.getRestrictionType(
				vendorId,
				purposeId
			);
			if (restrictionType === undefined) {
				continue;
			}
			const key = `${String(purposeId)}:${String(restrictionType)}`;
			const existing = grouped.get(key) as { vendorIds: number[] } | undefined;
			if (existing) {
				existing.vendorIds.push(vendorId);
			} else {
				grouped.set(key, { purposeId, restrictionType, vendorIds: [vendorId] });
			}
		}
	}
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
		publisherConsents: ids(decoded.publisherConsents),
		publisherCountryCode: decoded.publisherCountryCode,
		publisherCustomConsents: ids(decoded.publisherCustomConsents),
		publisherCustomLegitimateInterests: ids(
			decoded.publisherCustomLegitimateInterests
		),
		publisherLegitimateInterests: ids(decoded.publisherLegitimateInterests),
		publisherRestrictions: [...grouped.values()].sort(
			(a, b) =>
				Number(a.purposeId) - Number(b.purposeId) ||
				Number(a.restrictionType) - Number(b.restrictionType)
		),
		purposeConsents: ids(decoded.purposeConsents),
		purposeLegitimateInterests: ids(decoded.purposeLegitimateInterests),
		purposeOneTreatment: decoded.purposeOneTreatment,
		specialFeatureOptins: ids(decoded.specialFeatureOptins),
		supportOOB: decoded.supportOOB,
		useNonStandardTexts: decoded.useNonStandardTexts,
		vectorMaxIds: {
			publisherCustomConsents: Number(decoded.numCustomPurposes),
			vendorConsents: decoded.vendorConsents.maxId,
			vendorLegitimateInterests: decoded.vendorLegitimateInterests.maxId,
			vendorsAllowed: decoded.vendorsAllowed.maxId,
			vendorsDisclosed: decoded.vendorsDisclosed.maxId,
		},
		vendorConsents: ids(decoded.vendorConsents),
		vendorLegitimateInterests: ids(decoded.vendorLegitimateInterests),
		vendorListVersion: Number(decoded.vendorListVersion),
		vendorsAllowed: ids(decoded.vendorsAllowed),
		vendorsDisclosed: ids(decoded.vendorsDisclosed),
		version: Number(decoded.version),
	};
};

describe('tc-string fixtures reproduce from their own input', () => {
	test('the committed set is not empty', () => {
		expect(FIXTURES.length).toBe(TC_STRING_FIXTURE_IDS.length);
	});

	// Requirement: round-trip every fixture through the reference in both directions.
	test('every pinned string is re-encoded from input alone', () => {
		for (const fixture of FIXTURES) {
			const encoded = TCString.encode(
				modelFromInput(fixture),
				fixture.input.encodingOptions
			);
			expect(encoded, `${fixture.id} re-encode`).toBe(
				fixture.expected.encode.tcString
			);
		}
	});

	test('every decode expectation is re-read from the pinned string', () => {
		for (const fixture of FIXTURES) {
			const decoded = fieldsFrom(
				TCString.decode(fixture.expected.encode.tcString)
			);
			expect(decoded, `${fixture.id} decode read-back`).toEqual(
				fixture.expected.decode.fields
			);
		}
	});

	test('segments and segment types match the string they came from', () => {
		for (const fixture of FIXTURES) {
			const { segmentTypes, segments, tcString } = fixture.expected.encode;
			expect(segments).toEqual(tcString.split('.'));
			expect(segmentTypes.length).toBe(segments.length);
			expect(segments.length).toBeGreaterThan(0);
			// Every string opens with the core segment, whose leading bits are 0.
			expect(segmentTypes[0]).toBe(0);
		}
	});
});

describe('tc-string fixtures are byte-stable', () => {
	const index = readIndex();

	// Requirement: generate twice and compare bytes. Any nondeterminism has to surface
	// here rather than get sorted or retried into agreement.
	test('two builds of the same clock produce the same bytes', () => {
		const first = buildTcStringFixtures(index.clock, index.protocolVersion);
		const second = buildTcStringFixtures(index.clock, index.protocolVersion);
		expect(second.length).toBe(first.length);
		for (let i = 0; i < first.length; i += 1) {
			expect(JSON.stringify(second[i])).toBe(JSON.stringify(first[i]));
		}
	});

	test('the committed files are what a fresh build writes', () => {
		const built = buildTcStringFixtures(index.clock, index.protocolVersion);
		const byId = new Map(FIXTURES.map((f) => [f.id, f]));
		for (const fixture of built) {
			expect(byId.get(fixture.id), `${fixture.id} on disk`).toEqual(
				JSON.parse(JSON.stringify(fixture))
			);
		}
	});

	test('the clock survives the reference date resolution exactly', () => {
		for (const fixture of FIXTURES) {
			expect(fixture.input.now % 100).toBe(0);
			expect(fixture.input.now).toBe(index.clock);
		}
	});
});

describe('tc-string populations', () => {
	test('parity vectors carry only what c15t writes, and always at the day floor', () => {
		const parity = FIXTURES.filter((f) => f.population === 'parity');
		expect(parity.length).toBeGreaterThan(0);
		for (const fixture of parity) {
			expect(fixture.expects).toEqual({ decode: true, encode: true });
			const day = Math.floor(fixture.input.now / 86_400_000) * 86_400_000;
			// c15t truncates the confirmation time before it reaches the model, so a
			// port that stamps the raw clock cannot reproduce these bytes.
			expect(fixture.input.model.created).toBe(day);
			expect(fixture.input.model.lastUpdated).toBe(day);
			expect(fixture.input.model.purposeOneTreatment).toBe(false);
			expect(fixture.input.model.useNonStandardTexts).toBe(false);
			expect(fixture.input.model.numCustomPurposes).toBe(0);
			expect(fixture.input.model.publisherRestrictions).toEqual([]);
			expect(fixture.input.model.vendorsAllowed).toEqual([]);
		}
	});

	test('decode-coverage vectors reach past c15t and are not graded on encoding', () => {
		const coverage = FIXTURES.filter((f) => f.population === 'decode-coverage');
		expect(coverage.length).toBeGreaterThan(0);
		for (const fixture of coverage) {
			expect(fixture.expects.encode).toBe(false);
			expect(fixture.expects.decode).toBe(true);
		}
	});

	test('the population split is recorded in the file, not guessed from the id', () => {
		for (const fixture of FIXTURES) {
			const prefix =
				fixture.population === 'parity'
					? 'tc-string-parity-'
					: 'tc-string-decode-';
			expect(fixture.id.startsWith(prefix), fixture.id).toBe(true);
		}
	});
});

describe('tc-string coverage of the cases that actually differ', () => {
	const byId = new Map(FIXTURES.map((f) => [f.id, f]));
	const ids = TC_STRING_FIXTURE_IDS;

	test('every mandated vector is on disk', () => {
		for (const id of ids) {
			expect(byId.has(id), id).toBe(true);
		}
	});

	test('the bitfield-to-range crossover is pinned on both sides', () => {
		const low = byId.get('tc-string-parity-single-vendor-id-45');
		const high = byId.get('tc-string-parity-single-vendor-id-46');
		expect(low).toBeDefined();
		expect(high).toBeDefined();
		// One vendor each. Past the boundary the range encoding wins outright, so the
		// string gets shorter even though it carries one more id.
		expect(
			(high as TcStringFixtureFile).expected.encode.tcString.length
		).toBeLessThan(
			(low as TcStringFixtureFile).expected.encode.tcString.length
		);
	});

	test('vendor lists are pinned empty, single, dense, sparse and long', () => {
		for (const id of [
			'tc-string-parity-nothing-set',
			'tc-string-parity-vendor-consents-single',
			'tc-string-parity-vendor-consents-bitfield',
			'tc-string-parity-vendor-consents-range',
			'tc-string-parity-vendor-consents-sparse-range',
			'tc-string-parity-vendors-disclosed-long-bitfield',
		]) {
			expect(byId.has(id), id).toBe(true);
		}
		expect(
			(byId.get('tc-string-parity-nothing-set') as TcStringFixtureFile).input
				.model.vendorConsents
		).toEqual([]);
	});

	test('publisher restrictions are pinned empty, mixed-entry and all three types', () => {
		const mixed = byId.get(
			'tc-string-decode-restrictions-mixed-single-and-range'
		) as TcStringFixtureFile;
		const decoded = mixed.expected.decode.fields.publisherRestrictions as {
			vendorIds: number[];
		}[];
		// The range entry materialises every id in its interval, so the read-back is
		// far larger than the four ids the input named.
		expect(decoded[0].vendorIds.length).toBeGreaterThan(200);
		const three = byId.get('tc-string-decode-restrictions-three-types');
		expect(three).toBeDefined();
		const threeRestrictions = (three as TcStringFixtureFile).expected.decode
			.fields.publisherRestrictions as { restrictionType: number }[];
		expect(threeRestrictions.map((r) => r.restrictionType).sort()).toEqual([
			0, 1, 2,
		]);
	});

	test('purposeOneTreatment is pinned set and unset, service-specific and global', () => {
		const on = byId.get(
			'tc-string-decode-purpose-one-treatment-service-specific'
		) as TcStringFixtureFile;
		const off = byId.get(
			'tc-string-parity-li-and-special-features'
		) as TcStringFixtureFile;
		expect(on.input.model.purposeOneTreatment).toBe(true);
		expect(off.input.model.purposeOneTreatment).toBe(false);
		expect(
			(
				byId.get(
					'tc-string-decode-purpose-one-treatment-global'
				) as TcStringFixtureFile
			).input.model.isServiceSpecific
		).toBe(false);
		expect(on.input.model.isServiceSpecific).toBe(true);
	});

	test('policy versions 4 and 5 differ by nothing but policyVersion', () => {
		const four = byId.get(
			'tc-string-parity-policy-version-4'
		) as TcStringFixtureFile;
		const five = byId.get(
			'tc-string-parity-policy-version-5'
		) as TcStringFixtureFile;
		expect(four.input.model).toEqual(five.input.model);
		expect(four.expected.decode.fields.policyVersion).toBe(4);
		expect(five.expected.decode.fields.policyVersion).toBe(5);
		expect(four.expected.encode.tcString).not.toBe(
			five.expected.encode.tcString
		);
	});

	test('created and lastUpdated are pinned apart', () => {
		const apart = byId.get(
			'tc-string-decode-created-before-last-updated'
		) as TcStringFixtureFile;
		expect(apart.input.model.created).toBeLessThan(
			apart.input.model.lastUpdated
		);
		expect(apart.expected.decode.fields.created).toBe(
			apart.input.model.created
		);
		expect(apart.expected.decode.fields.lastUpdated).toBe(
			apart.input.model.lastUpdated
		);
	});

	test('segment width variation is pinned by vendor ids and custom purposes', () => {
		const wide = byId.get(
			'tc-string-decode-wide-custom-purposes'
		) as TcStringFixtureFile;
		expect(wide.input.model.numCustomPurposes).toBe(50);
		const fourSegment = byId.get(
			'tc-string-decode-vendors-allowed-segment'
		) as TcStringFixtureFile;
		expect(fourSegment.expected.encode.segmentTypes).toEqual([0, 1, 2, 3]);
		// vendorListVersion is 12 bits and does not move any width; the ceiling is
		// pinned so a port that guesses a wider field fails here.
		const ceiling = byId.get(
			'tc-string-parity-vendor-list-version-max'
		) as TcStringFixtureFile;
		expect(ceiling.input.vendorList.vendorListVersion).toBe(4095);
	});
});

describe('tc-string notes name every loss the reference causes', () => {
	// Returns how many fragments it checked so each test owns its own assertion.
	const named = function named(id: string, ...fragments: string[]): number {
		const file = readdirSync(FIXTURE_DIR);
		expect(file).toContain(`${id}.json`);
		const fixture = FIXTURES.find((f) => f.id === id);
		expect(fixture, id).toBeDefined();
		const notes = (fixture as TcStringFixtureFile).notes.join('\n');
		for (const fragment of fragments) {
			expect(notes, `${id} should note ${fragment}`).toContain(fragment);
		}
		return fragments.length;
	};

	test('every fixture describes itself and carries at least one note', () => {
		for (const fixture of FIXTURES) {
			expect(fixture.notes.length).toBeGreaterThan(0);
			expect(fixture.description.length).toBeGreaterThan(30);
		}
	});

	test('the vector that loses legitimate interests says which purposes', () => {
		expect(
			named(
				'tc-string-parity-pruned-signals',
				'purposeLegitimateInterests',
				'vendorConsents loses'
			)
		).toBe(2);
	});

	test('the vector whose language is overwritten says so', () => {
		expect(
			named(
				'tc-string-parity-consent-language-from-vendor-list',
				'consentLanguage is not writable'
			)
		).toBe(1);
	});

	test('the range-materialised restriction says what a decoder must produce', () => {
		expect(
			named(
				'tc-string-decode-restrictions-mixed-single-and-range',
				'does not round-trip'
			)
		).toBe(1);
	});

	test('the supportOOB loss is named where it happens', () => {
		expect(
			named(
				'tc-string-decode-non-standard-texts-and-oob',
				'supportOOB is never encoded'
			)
		).toBe(1);
	});

	test('the custom-purpose loss is named where it happens', () => {
		expect(
			named('tc-string-decode-wide-custom-purposes', 'numCustomPurposes count')
		).toBe(1);
	});

	test('the no-publisher-section vectors name the consequence', () => {
		expect(
			named('tc-string-parity-service-specific-false', 'no publisherTC segment')
		).toBe(1);
	});
});

describe('tc-string oracle identity', () => {
	test('every fixture names the encoder that produced it', () => {
		for (const fixture of FIXTURES) {
			expect(
				(fixture as unknown as { oracle: { package: string; version: string } })
					.oracle
			).toMatchObject(TC_STRING_ORACLE);
		}
	});
});
