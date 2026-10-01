/**
 * A `var(--c15t-…)` with no fallback is only as good as the token behind it.
 *
 * The variable names are produced by the resolver table in `theme/utils.ts`, so
 * a stylesheet that reaches for a plausible-sounding neighbour of a real token
 * gets nothing: `--c15t-font-weight-regular` next to a real
 * `--c15t-font-weight-normal`, or `--c15t-shadow-xl` above the top of a scale
 * that ends at `lg`. CSS does not error on that. The declaration becomes
 * invalid at computed-value time, the property falls back to its inherited or
 * initial value, and a surface quietly loses a weight or its elevation while
 * every build and type check stays green.
 *
 * Both have happened. These read the built stylesheets, so
 * `bun run --cwd packages/ui build` (which `test` depends on) must have run.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const SRC_DIR = join(__dirname, '..');
const DIST_DIR = join(__dirname, '..', '..', '..', 'dist');

const ENTRYPOINTS = ['styles.css', join('iab', 'styles.css')];

const read = function read(path: string): string {
	if (!existsSync(path)) {
		throw new Error(
			`Missing ${path}. Build @c15t/ui first: bun run --cwd packages/ui build`
		);
	}

	return readFileSync(path, 'utf8');
};

/** Every `.css` file under `src/styles`, however deeply nested. */
const sourceFiles = function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);

		if (entry.isDirectory()) {
			return entry.name === '__tests__' ? [] : sourceFiles(path);
		}

		return entry.name.endsWith('.css') ? [path] : [];
	});
};

/**
 * The name inside each `var()` that carries no fallback, so a nested
 * `var(--c15t-shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1))` is allowed to name
 * a token that does not exist: an override hook with a working default is the
 * pattern `panel-trigger.module.css` uses on purpose.
 */
const fallbacklessReferences = function fallbacklessReferences(source: string) {
	const names: string[] = [];

	for (let index = 0; index < source.length; index += 1) {
		if (!source.startsWith('var(', index)) {
			continue;
		}

		let depth = 1;
		let comma = false;
		let end = index + 4;

		for (; end < source.length && depth > 0; end += 1) {
			const char = source[end];

			if (char === '(') {
				depth += 1;
			} else if (char === ')') {
				depth -= 1;
			} else if (char === ',' && depth === 1) {
				comma = true;
				break;
			}

			if (depth === 0) {
				break;
			}
		}

		if (comma) {
			continue;
		}

		const inner = source.slice(index + 4, end).trim();

		if (inner.startsWith('--c15t-')) {
			names.push(inner);
		}
	}

	return names;
};

/** Variables the published sheets actually declare. */
const declared = new Set(
	ENTRYPOINTS.flatMap((entrypoint) => {
		const sheet = read(join(DIST_DIR, entrypoint));

		return [...sheet.matchAll(/(?<name>--c15t-[a-z0-9-]+)\s*:/gu)].map(
			(match) => match.groups?.name ?? ''
		);
	})
);

describe('stylesheet variable references', () => {
	const files = sourceFiles(SRC_DIR);

	test('the sources were found', () => {
		expect(files.length).toBeGreaterThan(10);
	});

	test('the published sheets declare the default tokens', () => {
		for (const name of [
			'--c15t-shadow-sm',
			'--c15t-shadow-lg',
			'--c15t-font-weight-normal',
			'--c15t-space-md',
		]) {
			expect(declared, name).toContain(name);
		}
	});

	test('every fallbackless var(--c15t-*) names a token that is declared', () => {
		const dangling = new Map<string, string[]>();

		for (const file of files) {
			for (const name of fallbacklessReferences(read(file))) {
				if (declared.has(name)) {
					continue;
				}

				const rel = file.slice(SRC_DIR.length + 1);
				dangling.set(name, [...(dangling.get(name) ?? []), rel]);
			}
		}

		expect(
			[...dangling.entries()].map(
				([name, where]) => `${name} used by ${[...new Set(where)].join(', ')}`
			)
		).toEqual([]);
	});
});
