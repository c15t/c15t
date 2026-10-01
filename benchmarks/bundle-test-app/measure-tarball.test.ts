import { randomBytes } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { isBundledDocsPath, runTarballSize } from './measure-tarball';
import type { PackRunner } from './measure-tarball';

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

const writeFiles = (root: string, files: Record<string, string>) => {
	for (const [path, contents] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), contents);
	}
};

const packageFiles = {
	'AGENTS.md': '# Docs index',
	'SKILL.md': '# Skill',
	'dist/index.js': 'export {};',
	'docs/quickstart.md': '# Quickstart',
	'package.json': '{}',
};

const createPackage = () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-pack-source-'));
	roots.push(root);
	writeFiles(root, packageFiles);
	return root;
};

const ok = (stdout: string) => ({ status: 0, stderr: '', stdout });

/**
 * Lists the package files on `--dry-run`, then writes `fixture.tgz` into the
 * staging directory and records what was staged.
 */
const fakePack =
	(
		packOutput: string,
		staged: { cwd?: string; files?: string[] } = {}
	): PackRunner =>
	(cwd, args) => {
		if (args.includes('--dry-run')) {
			return ok(
				JSON.stringify([
					{
						filename: 'fixture.tgz',
						files: Object.keys(packageFiles).map((path) => ({ path })),
						size: 1,
					},
				])
			);
		}
		staged.cwd = cwd;
		staged.files = readdirSync(cwd, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) => join(entry.parentPath, entry.name).slice(cwd.length + 1))
			.sort();
		writeFileSync(join(cwd, 'fixture.tgz'), 'test');
		return ok(packOutput);
	};

describe('runTarballSize', () => {
	it('rejects pack failures instead of recording a zero-byte improvement', () => {
		expect(() =>
			runTarballSize(createPackage(), () => ({
				status: 1,
				stderr: 'pack error',
				stdout: '',
			}))
		).toThrow('npm pack failed');
	});

	it.each(['not-json', '', '[]', '[{}]', '[{"size":0}]'])(
		'rejects invalid pack output %s',
		(stdout) => {
			expect(() => runTarballSize(createPackage(), () => ok(stdout))).toThrow();
		}
	);

	it('rejects a listing without files', () => {
		expect(() =>
			runTarballSize(createPackage(), () =>
				ok(JSON.stringify([{ filename: 'fixture.tgz', files: [] }]))
			)
		).toThrow('Missing npm pack file list');
	});

	it.each([0, -1, '4', 5])(
		'rejects invalid or mismatched tarball size %s',
		(size) => {
			const staged: { cwd?: string } = {};
			expect(() =>
				runTarballSize(
					createPackage(),
					fakePack(JSON.stringify([{ filename: 'fixture.tgz', size }]), staged)
				)
			).toThrow('Invalid npm pack size');
			expect(staged.cwd && existsSync(staged.cwd)).toBe(false);
		}
	);

	it('packs everything except bundled docs and removes the staging copy', () => {
		const staged: { cwd?: string; files?: string[] } = {};
		const root = createPackage();
		expect(
			runTarballSize(
				root,
				fakePack(JSON.stringify([{ filename: 'fixture.tgz', size: 4 }]), staged)
			)
		).toEqual({
			notes: [
				`${root.split(/[/\\]/u).at(-1)}: 3 bundled docs files left out of the measured tarball.`,
			],
			size: 4,
		});
		expect(staged.files).toEqual([join('dist', 'index.js'), 'package.json']);
		expect(staged.cwd && existsSync(staged.cwd)).toBe(false);
		expect(existsSync(join(root, 'docs/quickstart.md'))).toBe(true);
	});

	it('measures the same size as the package published without docs', () => {
		const manifest = JSON.stringify({
			files: ['dist', 'docs', 'AGENTS.md', 'SKILL.md'],
			name: 'c15t-pack-fixture',
			version: '1.0.0',
		});
		const code = { 'dist/index.js': 'export const answer = 42;\n' };
		const withDocs = mkdtempSync(join(tmpdir(), 'c15t-pack-docs-'));
		const withoutDocs = mkdtempSync(join(tmpdir(), 'c15t-pack-code-'));
		roots.push(withDocs, withoutDocs);
		writeFiles(withDocs, {
			...code,
			'AGENTS.md': randomBytes(4096).toString('hex'),
			'SKILL.md': randomBytes(4096).toString('hex'),
			'docs/guide.md': randomBytes(16_384).toString('hex'),
			'package.json': manifest,
		});
		writeFiles(withoutDocs, { ...code, 'package.json': manifest });

		expect(runTarballSize(withDocs).size).toBe(
			runTarballSize(withoutDocs).size
		);
		expect(readdirSync(withDocs).some((file) => file.endsWith('.tgz'))).toBe(
			false
		);
	});
});

describe('isBundledDocsPath', () => {
	it.each([
		['AGENTS.md', true],
		['SKILL.md', true],
		['docs/frameworks/react/quickstart.md', true],
		['dist/index.js', false],
		['dist/docs/index.js', false],
		['README.md', false],
		['docsearch.js', false],
	])('%s → %s', (path, expected) => {
		expect(isBundledDocsPath(path)).toBe(expected);
	});
});
