/**
 * Package source that ships to browsers calls none of the built-ins Safari
 * 15.4 introduced; Chrome added them between 92 and 98. Consumer bundlers
 * lower syntax but do not polyfill built-ins, so one such call breaks the
 * provider in older browsers (#1658). Oxlint bans most of these by name; it
 * cannot tell an `.at()` call from a field named `at`, and it does not
 * read `.astro`, `.svelte` or `.vue` files.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { expect, test } from 'vitest';

const root = join(import.meta.dirname, '..');

// Server-only packages run on Node, which has all of these.
const serverOnly = new Set(['backend', 'cli', 'node-sdk']);

const banned = [
	{ name: 'structuredClone', pattern: /\bstructuredClone\s*\(/u },
	{ name: 'Object.hasOwn', pattern: /\bObject\.hasOwn\s*\(/u },
	{ name: 'Array#at', pattern: /\.at\s*\(/u },
	{ name: 'Array#findLast', pattern: /\.findLast(?:Index)?\s*\(/u },
];

const isTest = (path: string) =>
	/(?:^|\/)__tests__\/|\.(?:test|spec|test-d|spec-d)\.[cm]?[jt]sx?$/u.test(
		path
	);

const sourceFiles = function* sourceFiles(
	directory: string
): Generator<string> {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			yield* sourceFiles(path);
		} else if (/\.(?:[cm]?[jt]sx?|astro|svelte|vue)$/u.test(entry.name)) {
			yield path;
		}
	}
};

test('browser package source avoids built-ins older browsers lack', () => {
	const found: string[] = [];
	for (const entry of readdirSync(join(root, 'packages'), {
		withFileTypes: true,
	})) {
		if (!entry.isDirectory() || serverOnly.has(entry.name)) {
			continue;
		}
		const source = join(root, 'packages', entry.name, 'src');
		let files: string[];
		try {
			files = [...sourceFiles(source)];
		} catch {
			continue;
		}
		for (const file of files) {
			const path = relative(root, file);
			if (isTest(path)) {
				continue;
			}
			const lines = readFileSync(file, 'utf8').split('\n');
			for (const [index, line] of lines.entries()) {
				for (const { name, pattern } of banned) {
					if (pattern.test(line)) {
						found.push(`${path}:${index + 1} ${name}`);
					}
				}
			}
		}
	}
	expect(found).toEqual([]);
});
