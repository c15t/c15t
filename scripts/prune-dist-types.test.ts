import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { pruneDistTypes } from './prune-dist-types';

const directories: string[] = [];
afterEach(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const fixture = function fixture(
	files: Record<string, string>,
	extraManifest = {}
): string {
	const root = mkdtempSync(join(tmpdir(), 'prune-types-'));
	directories.push(root);
	writeFileSync(
		join(root, 'package.json'),
		JSON.stringify({
			name: 'fixture',
			types: './dist-types/index.d.ts',
			...extraManifest,
		})
	);
	for (const [name, text] of Object.entries(files)) {
		const path = join(root, 'dist-types', name);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, text);
	}
	return root;
};

describe('published declaration pruning', () => {
	test('retains wildcard exports with an empty capture', () => {
		const root = fixture(
			{
				'foo.d.ts': 'export interface Exact {}',
				'foobar.d.ts': 'export interface Longer {}',
				'index.d.ts': 'export {};',
				'orphan.d.ts': 'export {};',
			},
			{ exports: { './foo*': { types: './dist-types/foo*.d.ts' } } }
		);
		expect(pruneDistTypes(root)).toEqual(['dist-types/orphan.d.ts']);
	});

	test('rejects nested package resolution before deleting declarations', () => {
		const root = fixture({
			'index.d.ts': 'export * from "./nested";',
			'nested/actual.d.ts': 'export interface Actual {}',
			'nested/index.d.ts': 'export {};',
			'nested/package.json': '{"types":"actual.d.ts"}',
			'orphan.d.ts': 'export {};',
		});
		expect(() => pruneDistTypes(root)).toThrow('Nested declaration package');
		expect(existsSync(join(root, 'dist-types/nested/actual.d.ts'))).toBe(true);
		expect(existsSync(join(root, 'dist-types/orphan.d.ts'))).toBe(true);
	});
	test.each([
		['mjs', 'mts'],
		['cjs', 'cts'],
		['js', 'ts'],
	])(
		'resolves %s to its matching declaration extension',
		(extension, declaration) => {
			const root = fixture({
				'index.d.ts': `export * from "./other.${extension}";`,
				'other.d.cts': 'export interface Common {}',
				'other.d.mts': 'export interface Module {}',
				'other.d.ts': 'export interface Default {}',
			});
			expect(pruneDistTypes(root)).not.toContain(
				`dist-types/other.d.${declaration}`
			);
			expect(existsSync(join(root, `dist-types/other.d.${declaration}`))).toBe(
				true
			);
		}
	);

	test.each(['#alias', 'fixture/private', './local'])(
		'aborts before deletion for unsupported reference types %s',
		(reference) => {
			const root = fixture({
				'index.d.ts': `/// <reference types="${reference}" />\nexport {};`,
				'orphan.d.ts': 'export {};',
			});
			expect(() => pruneDistTypes(root)).toThrow();
			expect(existsSync(join(root, 'dist-types/orphan.d.ts'))).toBe(true);
		}
	);

	test('rejects an output-directory symlink before touching its target', () => {
		const target = fixture({
			'index.d.ts': 'export {};',
			'orphan.d.ts': 'export {};',
		});
		const root = fixture({});
		symlinkSync(join(target, 'dist-types'), join(root, 'dist-types'), 'dir');
		expect(() => pruneDistTypes(root)).toThrow('symlink');
		expect(existsSync(join(target, 'dist-types/orphan.d.ts'))).toBe(true);
	});
	test('retains recursive imports, import types and references, deleting only unreachable output', () => {
		const root = fixture({
			'ambient.d.ts': 'declare const fixtureGlobal: string;',
			'index.d.ts':
				'export * from "./public.js"; export type Value = import("./value").Value;',
			'nested/index.d.ts': 'export interface Nested { count: number }',
			'orphan.d.ts': 'export interface Unused {}',
			'public.d.ts':
				'/// <reference path="./ambient.d.ts" />\nexport type { Nested } from "./nested";',
			'value.d.ts': 'export interface Value { value: string }',
		});
		expect(pruneDistTypes(root)).toEqual(['dist-types/orphan.d.ts']);
		expect(pruneDistTypes(root)).toEqual([]);
	});

	test('retains conditional and wildcard public type entries and ambient augmentations', () => {
		const root = fixture(
			{
				'augment.d.ts': 'declare module "external" { interface Augmented {} }',
				'browser.d.ts': 'export interface Browser {}',
				'features/first.d.ts': 'export interface First {}',
				'global.d.ts':
					'export {}; declare global { const fixtureGlobal: number; }',
				'index.d.ts': 'export {};',
				'orphan.d.ts': 'export {};',
			},
			{
				exports: {
					'.': {
						browser: { types: './dist-types/browser.d.ts' },
						default: './dist/index.js',
					},
					'./features/*': { types: './dist-types/features/*.d.ts' },
				},
			}
		);
		expect(pruneDistTypes(root)).toEqual(['dist-types/orphan.d.ts']);
	});

	test.each(['./missing', '../outside', '#alias', 'fixture/private'])(
		'aborts before deletion for unresolved or unsupported reference %s',
		(specifier) => {
			const root = fixture({
				'index.d.ts': `export * from ${JSON.stringify(specifier)};`,
				'orphan.d.ts': 'export {};',
			});
			expect(() => pruneDistTypes(root)).toThrow();
			expect(existsSync(join(root, 'dist-types/orphan.d.ts'))).toBe(true);
		}
	);

	test.each([
		{ exports: { './feature': { types: './dist-types/other' } } },
		{ exports: { './feature': './dist-types/other.js' } },
		{ exports: { '.': { 'types@>=5.0': './dist-types/other' } } },
		{ exports: { './missing': { types: './dist-types/missing.d.ts' } } },
		{ typesVersions: { '*': { '*': ['dist-types/*'] } } },
		{ imports: { '#alias': './dist-types/index.d.ts' } },
		{ types: '../outside.d.ts' },
	])('aborts for unsupported or broken package type routes', (manifest) => {
		const root = fixture(
			{ 'index.d.ts': 'export {};', 'orphan.d.ts': 'export {};' },
			manifest
		);
		expect(() => pruneDistTypes(root)).toThrow();
		expect(existsSync(join(root, 'dist-types/orphan.d.ts'))).toBe(true);
	});
});
