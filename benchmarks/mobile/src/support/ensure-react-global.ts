/**
 * Work around a defect in the shipped `@c15t/react-native` output.
 *
 * `dist/provider/c15t-provider.js` compiles its JSX with the classic runtime
 * (`React.createElement`) without importing `React`, while every other file in
 * the same build uses the automatic runtime. Nothing in a React Native app
 * defines a `React` global, so the provider would throw on first render there.
 *
 * The benchmark measures the published artifact rather than a patched copy, so
 * it supplies the global the artifact expects and reports the file count as a
 * row. Seeing that row fail is the point; hiding it by patching `dist` is not.
 *
 * @returns Absolute paths of the affected files, empty when the defect is gone.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as React from 'react';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Built output of the package under test. */
export const REACT_NATIVE_DIST = resolve(
	HERE,
	'..',
	'..',
	'..',
	'..',
	'packages',
	'react-native',
	'dist'
);

const collect = function collect(dir: string, found: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return found;
	}

	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			collect(full, found);
			continue;
		}
		if (!entry.endsWith('.js')) {
			continue;
		}
		const text = readFileSync(full, 'utf8');
		const usesGlobalReact = /(?<before>[^./\w$])React\./u.test(text);
		const importsReact =
			/(?:^|\n)\s*import\s+(?:\*\s+as\s+React|React)\s+from\s+['"]react['"]/u.test(
				text
			);
		if (usesGlobalReact && !importsReact) {
			found.push(full);
		}
	}

	return found;
};

/**
 * Find every built file that needs a `React` global it never imports.
 *
 * @returns Absolute paths, empty when the build is clean.
 */
export const findMissingReactImports =
	function findMissingReactImports(): string[] {
		return collect(REACT_NATIVE_DIST);
	};

/**
 * Install the global if the build needs it, so the benchmark can render at all.
 *
 * @returns The affected files, for the report.
 */
export const ensureReactGlobalForDist =
	function ensureReactGlobalForDist(): string[] {
		const affected = findMissingReactImports();

		if (affected.length > 0) {
			(globalThis as unknown as { React?: typeof React }).React = React;
		}

		return affected;
	};
