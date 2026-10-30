import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, expect, test } from 'vitest';

const oxlint = fileURLToPath(
	new URL('../node_modules/.bin/oxlint', import.meta.url)
);
const plugin = fileURLToPath(
	new URL('oxlint-browser-built-ins.mjs', import.meta.url)
);

const directories: string[] = [];
afterEach(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

/** The `file:line` of each `c15t/no-array-at` report in the given files. */
const lint = (files: Record<string, string>): string[] => {
	const directory = mkdtempSync(join(tmpdir(), 'c15t-oxlint-'));
	directories.push(directory);
	writeFileSync(
		join(directory, '.oxlintrc.json'),
		JSON.stringify({
			categories: {},
			jsPlugins: [plugin],
			rules: { 'c15t/no-array-at': 'error' },
		})
	);
	for (const [name, source] of Object.entries(files)) {
		writeFileSync(join(directory, name), source);
	}
	let output: string;
	try {
		output = execFileSync(
			oxlint,
			['-c', '.oxlintrc.json', '--format', 'unix', ...Object.keys(files)],
			{ cwd: directory, encoding: 'utf8' }
		);
	} catch (error) {
		// Oxlint exits 1 when it reports errors.
		output = String((error as { stdout?: unknown }).stdout ?? '');
	}
	return output
		.split('\n')
		.filter((line) => line.includes('no-array-at'))
		.map((line) => line.split(':').slice(0, 2).join(':'));
};

test('flags .at() calls, not fields, comments or strings', () => {
	expect(
		lint({
			'source.ts': [
				'// Do not use [1].at(-1).',
				'/** Not [1].at(-1) either. */',
				'const tap = { at: 1 };',
				'export const time = tap.at;',
				"export const text = 'https://x.test /* [1].at(0) */';",
				// oxlint-disable-next-line no-template-curly-in-string -- Source text.
				'export const interpolated = `${[1].at(-1)}`;',
				'/* note */ export const last = [1].at(-1);',
				'export const optional = [1]?.at(-2);',
				"export const computed = [1]['at'](0);",
				"export const other = [1]['map'](String);",
			].join('\n'),
		})
	).toEqual(['source.ts:6', 'source.ts:7', 'source.ts:8', 'source.ts:9']);
});

test('flags .at() calls in component scripts', () => {
	expect(
		lint({
			'panel.astro': '<script>\nconst last = [1].at(-1);\n</script>\n',
			'panel.svelte':
				'<script lang="ts">\nconst last = [1].at(-1);\n</script>\n<div></div>\n',
			'panel.vue':
				'<script setup lang="ts">\nconst last = [1].at(-1);\n</script>\n<template><div /></template>\n',
		}).sort()
	).toEqual(['panel.astro:2', 'panel.svelte:2', 'panel.vue:2']);
});
