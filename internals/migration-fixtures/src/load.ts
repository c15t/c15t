/**
 * Reads committed fixtures so tests can assert against them.
 *
 * Fixtures are JSON on disk rather than generated at test time on purpose: a
 * test that regenerated them would be asserting a release against itself. The
 * committed file is the record of what a published release actually produced,
 * and a diff to it in review is the signal that something changed.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { EngineName } from './engines';
import type { CapturedSchemaSnapshot } from './introspect';

const FIXTURES_DIR = join(
	dirname(dirname(fileURLToPath(import.meta.url))),
	'fixtures'
);

/** Recorded reason a release cannot produce a fixture on a given engine. */
export interface UnsupportedSchemaSnapshot {
	readonly ['shape']: string;
	readonly engine: string;
	readonly versions: readonly string[];
	readonly era: string;
	readonly unsupported: string;
}

const readJson = async function readJson<T>(
	path: string
): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, 'utf8')) as T;
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return undefined;
		}
		throw error;
	}
};

/**
 * Loads one fixture.
 *
 * Returns `{ kind: 'unsupported' }` where the release provably cannot produce
 * that fixture on that engine — currently the two fumadb fixtures on MySQL, which
 * fumadb cannot migrate at all. Callers must handle that case rather than
 * treating a missing fixture as a failure; the absence is a finding.
 */
export const loadFixture = async function loadFixture(
	fixture: string,
	engine: EngineName
): Promise<
	| { readonly kind: 'captured'; readonly fixture: CapturedSchemaSnapshot }
	| { readonly kind: 'unsupported'; readonly reason: UnsupportedSchemaSnapshot }
> {
	const base = join(FIXTURES_DIR, fixture);

	const unsupported = await readJson<UnsupportedSchemaSnapshot>(
		join(base, `${engine}.unsupported.json`)
	);
	if (unsupported) {
		return { kind: 'unsupported', reason: unsupported };
	}

	const captured = await readJson<CapturedSchemaSnapshot>(
		join(base, `${engine}.json`)
	);
	if (!captured) {
		throw new Error(
			`No fixture for database shape "${fixture}" on engine "${engine}". ` +
				'Regenerate with: bun run --cwd internals/migration-fixtures generate'
		);
	}
	return { fixture: captured, kind: 'captured' };
};

/** Table names in a captured shape, excluding fumadb's own marker table. */
export const domainTableNames = function domainTableNames(
	fixture: CapturedSchemaSnapshot
): readonly string[] {
	return (
		fixture.tables
			.map((table) => table.name)
			// oxlint-disable-next-line prefer-named-capture-group -- Capture indexes are part of the compatibility matcher contract.
			.filter((name) => !/(^|_)c15t_settings$/u.test(name))
			.sort()
	);
};

/** Column names for one table in a captured shape, sorted. */
export const columnNames = function columnNames(
	fixture: CapturedSchemaSnapshot,
	table: string
): readonly string[] {
	const found = fixture.tables.find((candidate) => candidate.name === table);
	if (!found) {
		const known = fixture.tables.map((candidate) => candidate.name).join(', ');
		throw new Error(
			`Fixture "${fixture['shape']}/${fixture.engine}" has no table "${table}". Has: ${known}`
		);
	}
	return found.columns.map((column) => column.name).sort();
};
