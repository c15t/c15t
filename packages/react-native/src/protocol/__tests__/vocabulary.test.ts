/**
 * One consent vocabulary, three implementations, no shared compiler.
 *
 * `src/protocol/vocabulary.ts` owns the category names and wire spellings this
 * package renders, and `vocabulary.type-test.ts` holds them against `@c15t/core`
 * at compile time. That leaves the half a type checker cannot see: Swift and
 * Kotlin declare the same names in languages nothing here compiles together, and
 * a category that exists on one platform and not another is a subject's decision
 * silently dropped on the other.
 *
 * So the three spellings are read off the three sources and compared here, with
 * the JavaScript kernel as the oracle, which is what `native/CONTRACT.md` rule 4
 * says decides a disagreement. `@c15t/core` is a devDependency for exactly this:
 * the kernel is the reference, never a runtime dependency of a phone app.
 *
 * Order is compared where the contract compares order. Categories are the order a
 * preference centre lists rows in and the order a save body enumerates receipts
 * in, so Swift's declaration order and Kotlin's are both checked as sequences.
 * Kotlin's `OPTIONAL` documents itself as a sorted hashing order instead, so that
 * one is checked as a set.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	CONSENT_CATEGORIES as KERNEL_CONSENT_CATEGORIES,
	OPTIONAL_CONSENT_CATEGORIES as KERNEL_OPTIONAL_CONSENT_CATEGORIES,
} from '@c15t/core/consent-categories';
import { describe, expect, test } from 'vitest';

import {
	ACTIVE_SURFACES,
	CONSENT_CATEGORIES,
	NATIVE_MODELS,
	OPTIONAL_CONSENT_CATEGORIES,
	PROMPT_REASONS,
	RESTRICTION_REASONS,
} from '../vocabulary';

const HERE = dirname(fileURLToPath(import.meta.url));

const FIXTURE_DIR = resolve(HERE, '../../../../../native/protocol');

/** Where the two native cores keep their own copy of this vocabulary. */
const NATIVE_DIR = resolve(HERE, '../../../../../native');

interface IndexEntry {
	file: string;
}

interface FixtureFile {
	expected: Record<string, unknown>;
	id: string;
}

/** Read a native source, named the way `native/CONTRACT.md` names it. */
const readNative = function readNative(relativePath: string): string {
	const path = join(NATIVE_DIR, relativePath);

	try {
		return readFileSync(path, 'utf8');
	} catch (error) {
		throw new Error(
			`cannot read ${relativePath}: this check needs the native sources it compares against (${path})`,
			{ cause: error }
		);
	}
};

/** The Swift core's whole vocabulary, in the one file that holds it. */
const SWIFT_VOCABULARY = readNative(
	'core-swift/Sources/C15tCore/ConsentCategory.swift'
);

const KOTLIN_CATEGORIES = readNative(
	'core-android/c15t-core/src/main/kotlin/com/c15t/core/model/ConsentCategory.kt'
);

const KOTLIN_ENUMS = readNative(
	'core-android/c15t-core/src/main/kotlin/com/c15t/core/model/Enums.kt'
);

const KOTLIN_POLICY_EVALUATOR = readNative(
	'core-android/c15t-core/src/main/kotlin/com/c15t/core/policy/PolicyEvaluator.kt'
);

const KOTLIN_SNAPSHOT_WIRE = readNative(
	'core-android/c15t-core/src/main/kotlin/com/c15t/core/wire/SnapshotWire.kt'
);

/**
 * The body between an enum's opening brace and the brace that closes it.
 *
 * The closing brace is matched at column zero on purpose: both cores indent a
 * `companion object` and a computed property, and the first brace at the margin is
 * the end of the enum rather than the end of something nested in it.
 */
const enumBody = function enumBody(
	source: string,
	header: string,
	name: string,
	language: string
): string {
	const declaration = new RegExp(
		`${header}[\\s\\S]*?\\{(?<body>[\\s\\S]*?)\\n\\}`,
		'u'
	).exec(source);
	const body = declaration?.groups?.body;

	if (!body) {
		throw new Error(
			`${language}: no ${name} declaration found, so the mobile vocabulary has nothing to be checked against`
		);
	}

	return body;
};

/** Refuse an empty read: a parser that matched nothing proves nothing. */
const requireValues = function requireValues(
	values: string[],
	name: string,
	language: string
): string[] {
	if (values.length === 0) {
		throw new Error(
			`${language}: ${name} parsed to no wire values, which means this parser stopped matching, not that the core is empty`
		);
	}

	return values;
};

/**
 * Raw values of a Swift `enum NAME: String`, in declaration order.
 *
 * A case with no explicit raw value takes its own name, which is how Swift spells
 * `gpc` and `none`. Only the enum body is scanned, so a doc comment naming another
 * enum cannot be read as a case.
 */
const swiftStringEnumValues = function swiftStringEnumValues(
	source: string,
	name: string
): string[] {
	const body = enumBody(source, `enum\\s+${name}:\\s*String`, name, 'swift');
	const values: string[] = [];

	for (const line of body.split('\n')) {
		const declared =
			/^\s*case\s+(?<name>[A-Za-z0-9_]+)(?:\s*=\s*"(?<raw>[^"]*)")?\s*$/u.exec(
				line
			);
		const caseName = declared?.groups?.name;

		if (caseName) {
			values.push(declared?.groups?.raw ?? caseName);
		}
	}

	return requireValues(values, name, 'swift');
};

/** The category names in a Swift `static let ordered: [OptionalConsentCategory]`. */
const swiftOptionalOrder = function swiftOptionalOrder(
	source: string
): string[] {
	const listed =
		/\bstatic let ordered: \[OptionalConsentCategory\] = \[(?<members>[^\]]*)\]/u.exec(
			source
		);
	const members = listed?.groups?.members;

	if (!members) {
		throw new Error(
			'swift: OptionalConsentCategory.ordered is gone, so the mobile optional order has nothing to be checked against'
		);
	}

	return requireValues(
		[...members.matchAll(/\.(?<caseName>[A-Za-z0-9_]+)/gu)].map(
			(match) => match.groups?.caseName ?? ''
		),
		'OptionalConsentCategory.ordered',
		'swift'
	);
};

/**
 * The entries of a Kotlin `enum class NAME(val wireName: String)`, keyed by entry.
 *
 * `@SerialName` is deliberately not read: `wireName` is what `fromWireName` parses
 * and what the snapshot encoder writes, and the two are only interchangeable while
 * they agree.
 */
const kotlinEnumEntries = function kotlinEnumEntries(
	source: string,
	name: string
): Map<string, string> {
	const body = enumBody(
		source,
		`enum class ${name}\\((?:[^)]*)\\)`,
		name,
		'kotlin'
	);
	const entries = new Map<string, string>();

	for (const line of body.split('\n')) {
		const declared =
			/^\s*(?<entry>[A-Z][A-Z0-9_]*)\s*\(\s*"(?<wireName>[^"]*)"\s*\)/u.exec(
				line
			);
		const entry = declared?.groups?.entry;
		const wireName = declared?.groups?.wireName;

		if (entry && wireName) {
			entries.set(entry, wireName);
		}
	}

	if (entries.size === 0) {
		throw new Error(
			`kotlin: ${name} parsed to no wire values, which means this parser stopped matching, not that the core is empty`
		);
	}

	return entries;
};

/** The wire names of a Kotlin enum, in declaration order. */
const kotlinWireNames = function kotlinWireNames(
	source: string,
	name: string
): string[] {
	return [...kotlinEnumEntries(source, name).values()];
};

/** The wire names in a Kotlin `val OPTIONAL: List<ConsentCategory> = listOf(...)`. */
const kotlinOptionalList = function kotlinOptionalList(
	source: string
): string[] {
	const listed =
		/\bval OPTIONAL: List<ConsentCategory> = listOf\((?<members>[^)]*)\)/u.exec(
			source
		);
	const members = listed?.groups?.members;

	if (!members) {
		throw new Error(
			'kotlin: ConsentCategory.OPTIONAL is gone, so the mobile optional set has nothing to be checked against'
		);
	}

	// The list names enum entries, and the wire is spelled by each entry's
	// `wireName`, so resolve before comparing: `EXPERIENCE` is not a category.
	const declared = kotlinEnumEntries(source, 'ConsentCategory');

	return [...members.matchAll(/\b(?<entry>[A-Z][A-Z0-9_]+)\b/gu)].map(
		(match) => {
			const entry = match.groups?.entry ?? '';
			const wireName = declared.get(entry);

			if (!wireName) {
				throw new Error(
					`kotlin: ConsentCategory.OPTIONAL lists ${entry}, which ConsentCategory does not declare`
				);
			}

			return wireName;
		}
	);
};

/**
 * String constants whose name starts with `prefix`, for the Kotlin wire values that
 * are not enums.
 *
 * Kotlin spells restriction reasons and prompt reasons as `const val`s beside the
 * code that writes them. A core that stopped producing one of ours is fine; a core
 * that invented a spelling is not, which is why the caller compares a subset.
 */
const kotlinStringConsts = function kotlinStringConsts(
	source: string,
	prefix: string
): string[] {
	return [
		...source.matchAll(
			new RegExp(`\\bconst val ${prefix}[A-Z0-9_]* = "(?<value>[^"]*)"`, 'gu')
		),
	].map(([, value]) => value);
};

/**
 * Every fixture the generator wrote, with the expectations it claims.
 *
 * The fixtures are generated from the kernel, so they are the kernel's vocabulary
 * in JSON: a table here that no fixture agrees with has already drifted from the
 * bytes both native cores are graded against.
 */
const readFixtures = function readFixtures(): FixtureFile[] {
	const index = JSON.parse(
		readFileSync(resolve(FIXTURE_DIR, 'index.json'), 'utf8')
	) as { fixtures: IndexEntry[] };

	return index.fixtures.map(
		(entry) =>
			JSON.parse(
				readFileSync(resolve(FIXTURE_DIR, entry.file), 'utf8')
			) as FixtureFile
	);
};

/** Read one field out of a fixture value, which is untyped JSON. */
const fieldOf = function fieldOf(value: unknown, field: string): unknown {
	if (value === null || typeof value !== 'object') {
		return undefined;
	}

	return (value as Record<string, unknown>)[field];
};

/** A copy in Kotlin's comparison order, for the fields order does not govern. */
const sorted = function sorted(values: readonly string[]): string[] {
	return [...values].sort();
};

describe('the mobile tables against the JavaScript kernel', () => {
	test('CONSENT_CATEGORIES is the kernel table, in the kernel order', () => {
		expect(CONSENT_CATEGORIES).toEqual([...KERNEL_CONSENT_CATEGORIES]);
	});

	test('OPTIONAL_CONSENT_CATEGORIES is the kernel table, in the kernel order', () => {
		expect(OPTIONAL_CONSENT_CATEGORIES).toEqual([
			...KERNEL_OPTIONAL_CONSENT_CATEGORIES,
		]);
	});

	test('the two tables agree with each other', () => {
		// The `satisfies` on the optional table proves each entry is a category.
		// This proves the reverse: that no category went missing from it.
		expect(
			CONSENT_CATEGORIES.filter((category) => category !== 'necessary')
		).toEqual([...OPTIONAL_CONSENT_CATEGORIES]);
	});
});

describe('the mobile tables against the generated fixtures', () => {
	const fixtures = readFixtures();

	test('the fixtures are there to check', () => {
		expect(fixtures.length).toBeGreaterThanOrEqual(20);
	});

	test('every fixture permission map has exactly these categories', () => {
		const maps = fixtures
			.flatMap((fixture) => [
				fieldOf(fieldOf(fixture.expected, 'snapshot'), 'effectivePermissions'),
				fieldOf(
					fieldOf(fixture.expected, 'snapshotAfter'),
					'effectivePermissions'
				),
				fieldOf(
					fieldOf(fixture.expected, 'snapshotBefore'),
					'effectivePermissions'
				),
				fieldOf(fieldOf(fixture.expected, 'savePayload'), 'consents'),
			])
			.filter((value) => value !== undefined);

		expect(maps.length).toBeGreaterThanOrEqual(20);

		for (const map of maps) {
			expect(sorted(Object.keys(map as Record<string, unknown>))).toEqual(
				sorted(CONSENT_CATEGORIES)
			);
		}
	});

	test('no fixture names a category the tables do not', () => {
		const named = new Set<string>();

		for (const fixture of fixtures) {
			for (const snapshotField of [
				'snapshot',
				'snapshotAfter',
				'snapshotBefore',
			]) {
				const snapshot = fieldOf(fixture.expected, snapshotField);
				const declared = fieldOf(snapshot, 'consentCategories');

				if (Array.isArray(declared)) {
					for (const category of declared) {
						named.add(String(category));
					}
				}

				const receipts = fieldOf(snapshot, 'explicitChoice');
				const categories = fieldOf(receipts, 'categories');

				if (categories !== null && typeof categories === 'object') {
					for (const category of Object.keys(categories)) {
						named.add(category);
					}
				}
			}
		}

		expect(named.size).toBeGreaterThan(0);

		for (const category of named) {
			expect(
				(CONSENT_CATEGORIES as readonly string[]).includes(category),
				`${category} is in the fixtures and not in the mobile tables`
			).toBe(true);
		}
	});
});

describe('the Swift core declares the same vocabulary', () => {
	test('categories, in display order', () => {
		expect(swiftStringEnumValues(SWIFT_VOCABULARY, 'ConsentCategory')).toEqual([
			...CONSENT_CATEGORIES,
		]);
	});

	test('optional categories, in the order receipts are enumerated in', () => {
		expect(swiftOptionalOrder(SWIFT_VOCABULARY)).toEqual([
			...OPTIONAL_CONSENT_CATEGORIES,
		]);
	});

	test('models, without the one a device refuses', () => {
		expect(swiftStringEnumValues(SWIFT_VOCABULARY, 'ConsentModel')).toEqual([
			...NATIVE_MODELS,
		]);
	});

	test('surfaces, with `none` decided and `null` absent', () => {
		expect(swiftStringEnumValues(SWIFT_VOCABULARY, 'ActiveUI')).toEqual([
			...ACTIVE_SURFACES,
		]);
	});

	test('restriction reasons', () => {
		expect(
			sorted(swiftStringEnumValues(SWIFT_VOCABULARY, 'RestrictionReason'))
		).toEqual(sorted(RESTRICTION_REASONS));
	});

	test('prompt reasons', () => {
		expect(
			sorted(swiftStringEnumValues(SWIFT_VOCABULARY, 'PromptReason'))
		).toEqual(sorted(PROMPT_REASONS));
	});
});

describe('the Kotlin core declares the same vocabulary', () => {
	test('categories, in display order', () => {
		expect(kotlinWireNames(KOTLIN_CATEGORIES, 'ConsentCategory')).toEqual([
			...CONSENT_CATEGORIES,
		]);
	});

	test("optional categories, in the Kotlin core's own sorted order", () => {
		// `OPTIONAL` documents itself as the canonical sorted order for hashing, so
		// the set is the promise here and the sequence belongs to JavaScript and Swift.
		expect(sorted(kotlinOptionalList(KOTLIN_CATEGORIES))).toEqual(
			sorted(OPTIONAL_CONSENT_CATEGORIES)
		);
		expect(kotlinOptionalList(KOTLIN_CATEGORIES)).toEqual(
			sorted(kotlinOptionalList(KOTLIN_CATEGORIES))
		);
	});

	test('models, without the one a device refuses', () => {
		expect(kotlinWireNames(KOTLIN_ENUMS, 'ConsentModel')).toEqual([
			...NATIVE_MODELS,
		]);
	});

	test('surfaces, with `none` decided and `null` absent', () => {
		expect(kotlinWireNames(KOTLIN_ENUMS, 'ActiveUI')).toEqual([
			...ACTIVE_SURFACES,
		]);
	});

	test('every restriction reason Kotlin writes is one the vocabulary names', () => {
		const written = kotlinStringConsts(KOTLIN_POLICY_EVALUATOR, 'RESTRICTION_');

		// Kotlin names the reasons it can produce rather than the whole union, so
		// this is containment: a spelling invented on one platform is the failure.
		expect(written.length).toBeGreaterThan(0);

		for (const reason of written) {
			expect(
				(RESTRICTION_REASONS as readonly string[]).includes(reason),
				`${reason} is written by Kotlin and not in the mobile vocabulary`
			).toBe(true);
		}
	});

	test('every prompt reason Kotlin writes is one the vocabulary names', () => {
		const written = kotlinStringConsts(KOTLIN_SNAPSHOT_WIRE, 'REASON_');

		expect(written.length).toBeGreaterThan(0);

		for (const reason of written) {
			expect(
				(PROMPT_REASONS as readonly string[]).includes(reason),
				`${reason} is written by Kotlin and not in the mobile vocabulary`
			).toBe(true);
		}
	});
});
