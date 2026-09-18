/**
 * The mobile package carries no consent kernel and no TCF codec.
 *
 * @c15t/react-native renders what a native core decides and hands it back over
 * the TurboModule bridge. That boundary is the reason the SDK exists, and it is
 * easy to lose quietly: `@c15t/core` is a devDependency, so a stray runtime
 * import type-checks, lints, and passes tests on a desktop before anyone notices
 * a JavaScript consent engine shipped inside the app bundle. The TC String
 * fixtures lane adds `@iabtechlabtcf/core` as a devDependency for the same
 * reason, and that package is a test-time oracle, nothing more.
 *
 * So the rule is checked against the source that actually ships: any *value*
 * import of a workspace package or of the reference encoder is a bug. Type-only
 * imports are fine and expected, because they erase at build time and cost the
 * bundle nothing.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..');

/** Specifiers that must never reach the app bundle as a runtime dependency. */
const FORBIDDEN = [
	'c15t',
	'@c15t/core',
	'@c15t/iab',
	'@c15t/backend',
	'@iabtechlabtcf/core',
];

/**
 * Every `import`/`re-export … from '…'` statement, so the specifier and its
 * clause can be judged together. Statements span lines, hence `s`.
 */
const IMPORT_STATEMENT =
	/(^|\n)[ \t]*(import|export)\s+(?:(?<clause>[\s\S]*?)\s+from\s+)?['"](?<specifier>[^'"]+)['"]/g;

/** Whether every named binding in a clause is erased by the compiler. */
const isTypeOnlyClause = function isTypeOnlyClause(
	kind: string,
	clause: string | undefined
): boolean {
	if (kind === 'import' && clause?.startsWith('type ')) {
		return true;
	}

	if (!clause || clause.startsWith('* as ') || !clause.startsWith('{')) {
		return false;
	}

	return clause
		.slice(1, clause.lastIndexOf('}'))
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.every((entry) => entry.startsWith('type '));
};

const sources = (function sources(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);

		if (statSync(full).isDirectory()) {
			// Test code is where the oracle is allowed to live.
			if (entry !== '__tests__' && entry !== 'node_modules') {
				sources(full, acc);
			}
			continue;
		}

		if (['.ts', '.tsx'].includes(extname(entry)) && !entry.endsWith('.d.ts')) {
			acc.push(full);
		}
	}

	return acc;
})(SRC);

test('the shipped source is large enough for this guard to mean anything', () => {
	// A guard that walks nothing passes, which is the worst kind of green.
	expect(sources.length).toBeGreaterThan(20);
});

test('no runtime import of the consent kernel or the TCF codec', () => {
	const offenders: string[] = [];

	for (const file of sources) {
		const text = readFileSync(file, 'utf8');

		for (const match of text.matchAll(IMPORT_STATEMENT)) {
			const specifier = match.groups?.specifier ?? '';
			const base = specifier.startsWith('@')
				? specifier.split('/').slice(0, 2).join('/')
				: specifier;

			if (
				FORBIDDEN.includes(base) &&
				!isTypeOnlyClause(match[2] ?? 'import', match.groups?.clause)
			) {
				offenders.push(`${relative(SRC, file)}: ${specifier}`);
			}
		}
	}

	expect(offenders).toEqual([]);
});

test('the kernel and the codec stay devDependencies', () => {
	const manifest = JSON.parse(
		readFileSync(join(SRC, '..', 'package.json'), 'utf8')
	) as { dependencies?: Record<string, string> };

	for (const name of FORBIDDEN) {
		expect(manifest.dependencies?.[name], name).toBeUndefined();
	}
});
