/**
 * One vendor list, four spellings, and no compiler that sees them together.
 *
 * `src/protocol/gvl.ts` copies the served vendor list so a phone app can read one
 * without the web schema in its bundle, and `gvl.type-test.ts` holds that copy
 * against `@c15t/core` at compile time. What neither can see is the pair of
 * producers that put the bytes on the bridge: a key renamed in Swift's
 * `GlobalVendorList.swift`, or one Kotlin's `GlobalVendorList.kt` adds, compiles
 * on its own side, leaves the fixtures green, and reaches a hand holding a
 * disclosure row with no name behind it.
 *
 * So the name sets are read off all four sources and compared here, with the
 * schema as the spelling both cores say they follow. Key *order* is not compared,
 * for the reason `gvl.ts` gives: every collection in this document is keyed by an
 * id that skips numbers by design. Containment stands in for equality where one
 * core stores five of these shapes as one type.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../../..');

/** Where each producer keeps its own copy of these names. */
const SCHEMA_FILE = 'packages/schema/src/shared/gvl.ts';
const SWIFT_LIST = 'native/core-swift/Sources/C15tCore/GlobalVendorList.swift';
const SWIFT_SNAPSHOT =
	'native/core-swift/Sources/C15tCore/ConsentSnapshot.swift';
const KOTLIN_PACKAGE =
	'native/core-android/c15t-core/src/main/kotlin/com/c15t/core';
const KOTLIN_LIST = `${KOTLIN_PACKAGE}/tc/GlobalVendorList.kt`;
const KOTLIN_JSON = `${KOTLIN_PACKAGE}/tc/GlobalVendorListJson.kt`;
const KOTLIN_SNAPSHOT = `${KOTLIN_PACKAGE}/model/Snapshot.kt`;
const KOTLIN_ENVELOPE = `${KOTLIN_PACKAGE}/store/SnapshotEnvelope.kt`;
const KOTLIN_KERNEL = `${KOTLIN_PACKAGE}/C15tKernel.kt`;

/**
 * The names `gvl.ts` declares, which every source below has to agree with.
 *
 * This is the mirror's own claim written as data, so a producer that renames a
 * key fails here rather than in a type checker that only sees one language. Each
 * list is alphabetical, and the sortedness check is what keeps a new name from
 * being appended anywhere but where a reader looking for it would expect it.
 */
const VENDOR_LIST_KEYS = [
	'dataCategories',
	'features',
	'gvlSpecificationVersion',
	'lastUpdated',
	'purposes',
	'specialFeatures',
	'specialPurposes',
	'stacks',
	'tcfPolicyVersion',
	'vendorListVersion',
	'vendors',
];

/** The collections that share the purpose shape, which is four of the five. */
const DEFINITION_KEYS = [
	'description',
	'descriptionLegal',
	'id',
	'illustrations',
	'name',
];

const STACK_KEYS = ['description', 'id', 'name', 'purposes', 'specialFeatures'];
const DATA_CATEGORY_KEYS = ['description', 'id', 'name'];
const VENDOR_URL_KEYS = ['langId', 'legIntClaim', 'privacy'];

const VENDOR_KEYS = [
	'cookieMaxAgeSeconds',
	'cookieRefresh',
	'dataCategories',
	'dataRetention',
	'deletedDate',
	'deviceStorageDisclosureUrl',
	'features',
	'flexiblePurposes',
	'id',
	'legIntPurposes',
	'name',
	'overflow',
	'purposes',
	'specialFeatures',
	'specialPurposes',
	'urls',
	'usesCookies',
	'usesNonCookieAccess',
];

const RETENTION_KEYS = ['purposes', 'specialPurposes', 'stdRetention'];
const OVERFLOW_KEYS = ['httpGetLimit'];

/** The one key the snapshot's `iab` object carries. */
const IAB_STATE_KEYS = ['gvl'];

/** The four fields both cores refuse a document without. */
const GATED_KEYS = [
	'purposes',
	'tcfPolicyVersion',
	'vendorListVersion',
	'vendors',
];

/** Read a producer's source, named the way a failure should name it. */
const readSource = function readSource(relativePath: string): string {
	const path = join(REPO, relativePath);

	try {
		return readFileSync(path, 'utf8');
	} catch (error) {
		throw new Error(`cannot read ${relativePath} (${path})`, { cause: error });
	}
};

const SCHEMA = readSource(SCHEMA_FILE);
const SWIFT = readSource(SWIFT_LIST);
const SWIFT_SNAPSHOT_SOURCE = readSource(SWIFT_SNAPSHOT);
const KOTLIN = readSource(KOTLIN_LIST);
const KOTLIN_JSON_SOURCE = readSource(KOTLIN_JSON);
const KOTLIN_MODEL = readSource(KOTLIN_SNAPSHOT);
const KOTLIN_ENVELOPE_SOURCE = readSource(KOTLIN_ENVELOPE);
const KOTLIN_KERNEL_SOURCE = readSource(KOTLIN_KERNEL);

/** Refuse a parser that stopped matching: an empty read proves nothing. */
const requireKeys = function requireKeys(
	keys: string[],
	what: string,
	language: string
): string[] {
	if (keys.length === 0) {
		throw new Error(
			`${language}: ${what} parsed to no keys, which means this parser stopped matching, not that the declaration is empty`
		);
	}

	return keys;
};

/** `name:` keys written with exactly `tabs` levels of indentation. */
const keysIndentedBy = function keysIndentedBy(
	body: string,
	tabs: number,
	what: string,
	language: string
): string[] {
	const pattern = new RegExp(`^\\t{${tabs}}(?<key>[A-Za-z0-9_]+):`, 'gmu');

	return requireKeys(
		[...body.matchAll(pattern)].map((match) => match.groups?.key ?? ''),
		what,
		language
	);
};

/** The body between a declaration and the closer that ends it at the margin. */
const bodyBetween = function bodyBetween(
	source: string,
	pattern: RegExp,
	what: string,
	language: string
): string {
	const body = pattern.exec(source)?.groups?.body;

	if (!body) {
		throw new Error(
			`${language}: no ${what} declaration found, so these names have nothing to be checked against`
		);
	}

	return body;
};

/**
 * Keys of a schema factory: `export const NAME = ... v.object({...})`();)();`.
 *
 * Members are read at two tabs, which is the depth a factory's own keys sit at,
 * so the members of `dataRetention`'s inline object -- four tabs down, inside the
 * vendor -- are not read as members of the vendor itself.
 */
const schemaKeys = function schemaKeys(source: string, name: string): string[] {
	const body = bodyBetween(
		source,
		new RegExp(
			`export const ${name} =[\\s\\S]*?v\\.object\\(\\{(?<body>[\\s\\S]*?)\\n\\t\\}\\)\\)\\(\\);`,
			'u'
		),
		name,
		'schema'
	);

	return keysIndentedBy(body, 2, name, 'schema');
};

/**
 * Keys of an object declared inline under another schema, such as
 * `gvlVendorSchema`'s `dataRetention`, which has no factory of its own.
 */
const inlineSchemaKeys = function inlineSchemaKeys(
	source: string,
	property: string
): string[] {
	const body = bodyBetween(
		source,
		new RegExp(
			`\\t${property}: v\\.optional\\(\\n\\t{3}v\\.object\\(\\{(?<body>[\\s\\S]*?)\\n\\t{3}\\}\\)`,
			'u'
		),
		`${property} (inline)`,
		'schema'
	);

	return keysIndentedBy(body, 4, property, 'schema');
};

/**
 * `public let` names of a Swift struct.
 *
 * The closing brace is matched at column zero, the way the vocabulary test
 * matches an enum: an `public init` or a computed property closes indented, so
 * the first brace at the margin is the end of the struct.
 */
const swiftKeys = function swiftKeys(source: string, name: string): string[] {
	const body = bodyBetween(
		source,
		new RegExp(
			`public struct ${name}:[\\s\\S]*?\\{(?<body>[\\s\\S]*?)\\n\\}`,
			'u'
		),
		name,
		'swift'
	);

	return requireKeys(
		[...body.matchAll(/^ {4}public let (?<key>[A-Za-z0-9_]+):/gmu)].map(
			(match) => match.groups?.key ?? ''
		),
		name,
		'swift'
	);
};

/** `case NAME` names inside a Swift struct's `enum CodingKeys`. */
const swiftCodingKeys = function swiftCodingKeys(
	source: string,
	name: string
): string[] {
	const body = bodyBetween(
		source,
		new RegExp(
			`public struct ${name}:[\\s\\S]*?\\{(?<body>[\\s\\S]*?)\\n\\}`,
			'u'
		),
		name,
		'swift'
	);

	return requireKeys(
		[...body.matchAll(/^ {8}case (?<key>[A-Za-z0-9_]+)$/gmu)].map(
			(match) => match.groups?.key ?? ''
		),
		`${name} coding keys`,
		'swift'
	);
};

/** The wire keys a Swift helper reads, for the accept gate. */
const swiftFieldKeys = function swiftFieldKeys(
	source: string,
	functionName: string
): string[] {
	const body = bodyBetween(
		source,
		new RegExp(
			`private static func ${functionName}[\\s\\S]*?\\{(?<body>[\\s\\S]*?)\\n {4}\\}`,
			'u'
		),
		functionName,
		'swift'
	);

	// A gate can ask the same field twice -- Swift reads `purposes` once as an
	// array and once as an object -- and a name asked twice is still one name.
	return requireKeys(
		[
			...new Set(
				[...body.matchAll(/fields\["(?<key>[A-Za-z0-9_]+)"\]/gmu)].map(
					(match) => match.groups?.key ?? ''
				)
			),
		],
		functionName,
		'swift'
	);
};

/** Key names of a Kotlin `data class NAME(...)`, closing paren at the margin. */
const kotlinKeys = function kotlinKeys(source: string, name: string): string[] {
	const body = bodyBetween(
		source,
		new RegExp(`data class ${name}\\((?<body>[\\s\\S]*?)\\n\\)`, 'u'),
		name,
		'kotlin'
	);

	return requireKeys(
		[...body.matchAll(/^\tval (?<key>[A-Za-z0-9_]+):/gmu)].map(
			(match) => match.groups?.key ?? ''
		),
		name,
		'kotlin'
	);
};

/** A copy in comparison order, because key order is not the promise here. */
const sorted = function sorted(keys: readonly string[]): string[] {
	return [...keys].sort();
};

describe('the vendor-list name sets', () => {
	test('every list is written where a reader looks for a name', () => {
		for (const keys of [
			VENDOR_LIST_KEYS,
			DEFINITION_KEYS,
			STACK_KEYS,
			DATA_CATEGORY_KEYS,
			VENDOR_URL_KEYS,
			VENDOR_KEYS,
			RETENTION_KEYS,
			OVERFLOW_KEYS,
			GATED_KEYS,
		]) {
			expect(keys).toEqual([...keys].sort());
			expect(new Set(keys).size).toBe(keys.length);
		}
	});
});

describe('the schema writes these names', () => {
	test('the document itself', () => {
		expect(sorted(schemaKeys(SCHEMA, 'globalVendorListSchema'))).toEqual(
			VENDOR_LIST_KEYS
		);
	});

	test('the collections, and the two records with a shape of their own', () => {
		for (const factory of [
			'gvlPurposeSchema',
			'gvlSpecialPurposeSchema',
			'gvlFeatureSchema',
			'gvlSpecialFeatureSchema',
		]) {
			expect(sorted(schemaKeys(SCHEMA, factory))).toEqual(DEFINITION_KEYS);
		}

		expect(sorted(schemaKeys(SCHEMA, 'gvlStackSchema'))).toEqual(STACK_KEYS);
		expect(sorted(schemaKeys(SCHEMA, 'gvlDataCategorySchema'))).toEqual(
			DATA_CATEGORY_KEYS
		);
		expect(sorted(schemaKeys(SCHEMA, 'gvlVendorUrlSchema'))).toEqual(
			VENDOR_URL_KEYS
		);
	});

	test('one vendor, including the two records declared inside it', () => {
		expect(sorted(schemaKeys(SCHEMA, 'gvlVendorSchema'))).toEqual(VENDOR_KEYS);
		expect(sorted(inlineSchemaKeys(SCHEMA, 'dataRetention'))).toEqual(
			RETENTION_KEYS
		);
		expect(sorted(inlineSchemaKeys(SCHEMA, 'overflow'))).toEqual(OVERFLOW_KEYS);
	});
});

describe('the Swift core writes these names', () => {
	test('the document itself', () => {
		expect(sorted(swiftKeys(SWIFT, 'GlobalVendorList'))).toEqual(
			VENDOR_LIST_KEYS
		);
	});

	test('the collections and records inside it', () => {
		// Swift stores the four purpose-shaped collections as `GVLDefinition` and the
		// data categories as the narrower `GVLDataCategory`, which is the schema's own
		// split rather than a mobile one.
		expect(sorted(swiftKeys(SWIFT, 'GVLDefinition'))).toEqual(DEFINITION_KEYS);
		expect(sorted(swiftKeys(SWIFT, 'GVLDataCategory'))).toEqual(
			DATA_CATEGORY_KEYS
		);
		expect(sorted(swiftKeys(SWIFT, 'GVLStack'))).toEqual(STACK_KEYS);
		expect(sorted(swiftKeys(SWIFT, 'GVLVendor'))).toEqual(VENDOR_KEYS);
		expect(sorted(swiftKeys(SWIFT, 'GVLVendorUrl'))).toEqual(VENDOR_URL_KEYS);
		expect(sorted(swiftKeys(SWIFT, 'GVLVendorDataRetention'))).toEqual(
			RETENTION_KEYS
		);
		expect(sorted(swiftKeys(SWIFT, 'GVLVendorOverflow'))).toEqual(
			OVERFLOW_KEYS
		);
	});

	test('the snapshot puts the list in iab and nothing else beside it', () => {
		expect(
			sorted(swiftCodingKeys(SWIFT_SNAPSHOT_SOURCE, 'KernelIABState'))
		).toEqual(IAB_STATE_KEYS);
	});

	test('a list is refused on exactly the four fields the protocol calls settled', () => {
		expect(sorted(swiftFieldKeys(SWIFT, 'passesReadGate'))).toEqual(GATED_KEYS);
	});
});

describe('the Kotlin core writes these names', () => {
	test('the document itself', () => {
		expect(sorted(kotlinKeys(KOTLIN, 'GlobalVendorList'))).toEqual(
			VENDOR_LIST_KEYS
		);
	});

	test('the records inside it', () => {
		// Kotlin stores data categories as `GvlLocalizedEntry` as well, the one type
		// it uses for all five purpose-shaped collections, so its entry is wider than
		// the schema's data category by the two names a category never carries. That
		// is storage and not wire: a key the mirror does not name is a key no reader
		// reads, and a key it does name has to mean the same thing on both sides.
		expect(sorted(kotlinKeys(KOTLIN, 'GvlLocalizedEntry'))).toEqual(
			DEFINITION_KEYS
		);
		for (const name of DATA_CATEGORY_KEYS) {
			expect(
				DEFINITION_KEYS,
				`${name} is a data-category name Kotlin keeps in GvlLocalizedEntry`
			).toContain(name);
		}

		expect(sorted(kotlinKeys(KOTLIN, 'GvlStack'))).toEqual(STACK_KEYS);
		expect(sorted(kotlinKeys(KOTLIN, 'GvlVendorEntry'))).toEqual(VENDOR_KEYS);
		expect(sorted(kotlinKeys(KOTLIN, 'GvlVendorUrl'))).toEqual(VENDOR_URL_KEYS);
		expect(sorted(kotlinKeys(KOTLIN, 'GvlDataRetention'))).toEqual(
			RETENTION_KEYS
		);
		expect(sorted(kotlinKeys(KOTLIN, 'GvlVendorOverflow'))).toEqual(
			OVERFLOW_KEYS
		);
	});

	test('the snapshot slot stays null and the list rides beside it', () => {
		// Android writes `null` where iOS writes a body, and the protocol type has to
		// admit both without pretending they are the same device. The Kotlin tests
		// grade the same promise (`SnapshotWireTest`, `VendorListRetentionTest`);
		// this one is what the TypeScript side is allowed to assume about it.
		const snapshotKeys = kotlinKeys(KOTLIN_MODEL, 'ConsentSnapshot');

		expect(snapshotKeys).toContain('iab');
		expect(snapshotKeys).not.toContain('gvl');
		expect(KOTLIN_MODEL).toMatch(
			/@SerialName\("iab"\)\s*\n\s*val iab: JsonElement = JsonNull/u
		);

		// Both halves of Android's answer, in the two places they live.
		expect(KOTLIN_ENVELOPE_SOURCE).toMatch(
			/val gvl: GlobalVendorList\? = null/u
		);
		expect(KOTLIN_KERNEL_SOURCE).toMatch(/fun vendorListBody\(\): String\?/u);
		expect(KOTLIN_JSON_SOURCE).toMatch(/encodeDefaults = false/u);
	});
});
