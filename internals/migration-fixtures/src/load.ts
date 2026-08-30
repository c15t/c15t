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
import type { CapturedShape } from './introspect';

const FIXTURES_DIR = join(
	dirname(dirname(fileURLToPath(import.meta.url))),
	'fixtures'
);

/** Recorded reason a release cannot produce a shape on a given engine. */
export interface UnsupportedShape {
	readonly shape: string;
	readonly engine: string;
	readonly versions: readonly string[];
	readonly era: string;
	readonly unsupported: string;
}

/**
 * Loads one fixture.
 *
 * Returns `{ kind: 'unsupported' }` where the release provably cannot produce
 * that shape on that engine — currently the two fumadb shapes on MySQL, which
 * fumadb cannot migrate at all. Callers must handle that case rather than
 * treating a missing fixture as a failure; the absence is a finding.
 */
export async function loadFixture(
	shape: string,
	engine: EngineName
): Promise<
	| { readonly kind: 'captured'; readonly fixture: CapturedShape }
	| { readonly kind: 'unsupported'; readonly reason: UnsupportedShape }
> {
	const base = join(FIXTURES_DIR, shape);

	const unsupported = await readJson<UnsupportedShape>(
		join(base, `${engine}.unsupported.json`)
	);
	if (unsupported) {
		return { kind: 'unsupported', reason: unsupported };
	}

	const captured = await readJson<CapturedShape>(join(base, `${engine}.json`));
	if (!captured) {
		throw new Error(
			`No fixture for shape "${shape}" on engine "${engine}". ` +
				'Regenerate with: bun run --cwd internals/migration-fixtures generate'
		);
	}
	return { kind: 'captured', fixture: captured };
}

/** Table names in a captured shape, excluding fumadb's own marker table. */
export function domainTableNames(
	fixture: CapturedShape
): ReadonlyArray<string> {
	return fixture.tables
		.map((table) => table.name)
		.filter((name) => !/(^|_)c15t_settings$/.test(name))
		.sort();
}

/** Column names for one table in a captured shape, sorted. */
export function columnNames(
	fixture: CapturedShape,
	table: string
): ReadonlyArray<string> {
	const found = fixture.tables.find((candidate) => candidate.name === table);
	if (!found) {
		const known = fixture.tables.map((candidate) => candidate.name).join(', ');
		throw new Error(
			`Fixture "${fixture.shape}/${fixture.engine}" has no table "${table}". Has: ${known}`
		);
	}
	return found.columns.map((column) => column.name).sort();
}

async function readJson<T>(path: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, 'utf8')) as T;
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return undefined;
		}
		throw error;
	}
}
