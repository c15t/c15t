import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	canReusePackPreparation,
	getBlockedReason,
	scanUiComponentStyleArtifacts,
	selectPublishDirectories,
} from './check-publish-artifacts';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

/** A directory inside the temporary root, created on demand. */
const makeTree = function makeTree(
	root: string,
	files: Record<string, string>
) {
	for (const [path, contents] of Object.entries(files)) {
		const target = join(root, path);

		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, contents);
	}
};

describe('release artifact selection', () => {
	it('checks exactly the requested public packages and rejects unknown or private names', () => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-publish-selection-'));
		try {
			for (const name of ['first', 'second', 'private']) {
				mkdirSync(join(root, name));
				writeFileSync(
					join(root, name, 'package.json'),
					JSON.stringify({ name, private: name === 'private' })
				);
			}
			expect(selectPublishDirectories(['first'], root)).toEqual([
				join(root, 'first'),
			]);
			expect(selectPublishDirectories([], root)).toEqual([
				join(root, 'first'),
				join(root, 'second'),
			]);
			expect(() => selectPublishDirectories(['missing'], root)).toThrow(
				'missing'
			);
			expect(() => selectPublishDirectories(['private'], root)).toThrow(
				'private'
			);
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	});

	it('only reuses standard docs and verification preparation after successful builds', () => {
		const prepack =
			'bun run build:docs && bun ../../scripts/verify-package-artifacts.ts';
		expect(canReusePackPreparation({ scripts: { prepack } })).toBe(true);
		expect(
			canReusePackPreparation({ scripts: { prepack: 'bun sync-native.ts' } })
		).toBe(false);
		expect(
			canReusePackPreparation({
				scripts: { prepack, prepare: 'bun generate.ts' },
			})
		).toBe(false);
		expect(
			canReusePackPreparation({ scripts: { postpack: 'bun sign.ts', prepack } })
		).toBe(false);
	});

	it('guards selected tarballs after reusing preparation and leaves unrelated packages out', () => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-publish-guard-'));
		try {
			for (const name of ['selected', 'unrelated']) {
				makeTree(root, {
					[`packages/${name}/package.json`]: JSON.stringify({
						exports: './dist/index.js',
						files: ['dist'],
						name: `c15t-ci-${name}`,
						scripts: {
							// This hook cannot run in the fixture. The guard must reuse its build.
							prepack: 'bun ../../scripts/verify-package-artifacts.ts',
						},
						version: '1.0.0',
					}),
				});
			}
			makeTree(root, { 'packages/selected/dist/index.js': 'export {};' });
			const guard = (name: string) =>
				spawnSync(
					'bun',
					[join(ROOT, 'scripts/check-publish-artifacts.ts'), '--built', name],
					{ cwd: root, encoding: 'utf8', timeout: 10_000 }
				);
			const selected = guard('c15t-ci-selected');
			expect(selected.status, selected.stderr).toBe(0);
			expect(selected.stdout).toContain('Checked 1 packages.');
			const missing = guard('c15t-ci-unrelated');
			expect(missing.status).toBe(1);
			expect(missing.stderr).toContain(
				'manifest target missing from packed files'
			);
			makeTree(root, {
				'packages/selected/dist/leaked.test.js': 'export {};',
			});
			const leaked = guard('c15t-ci-selected');
			expect(leaked.status).toBe(1);
			expect(leaked.stderr).toContain('test file');
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	});
});

describe('getBlockedReason', () => {
	it('rejects CommonJS artifacts outside dist', () => {
		// The ESM-only guard must cover the whole tarball: a stale shim or a
		// root-level .cjs entry is just as much a CommonJS leak as dist output.
		expect(getBlockedReason('c15t', 'shims/index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
		expect(getBlockedReason('@c15t/core', 'index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
	});

	it('rejects CommonJS artifacts under dist', () => {
		expect(getBlockedReason('@c15t/core', 'dist/index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
	});

	it('allows ESM runtime output and shims', () => {
		expect(getBlockedReason('@c15t/core', 'dist/index.js')).toBeNull();
		expect(getBlockedReason('c15t', 'shims/index.js')).toBeNull();
		expect(getBlockedReason('c15t', 'shims/index.d.ts')).toBeNull();
	});

	it('still rejects test artifacts in dist', () => {
		expect(getBlockedReason('@c15t/core', 'dist/foo.test.js')).toBe(
			'test file'
		);
	});

	it('allows the declaration for the @c15t/ui/styles/dialog export', () => {
		expect(getBlockedReason('@c15t/ui', 'dist/styles/dialog.d.ts')).toBeNull();
		expect(getBlockedReason('@c15t/ui', 'dist/styles/other.d.ts')).toBe(
			'declaration file in runtime dist'
		);
	});
});

describe('scanUiComponentStyleArtifacts', () => {
	let packageDir: string | undefined;

	afterEach(() => {
		if (packageDir) {
			rmSync(packageDir, { force: true, recursive: true });
			packageDir = undefined;
		}
	});

	const createUiPackage = (classMap: string) => {
		packageDir = mkdtempSync(join(tmpdir(), 'c15t-ui-artifacts-'));
		mkdirSync(join(packageDir, 'src/styles/components'), { recursive: true });
		mkdirSync(join(packageDir, 'dist/styles/components'), { recursive: true });
		writeFileSync(
			join(packageDir, 'src/styles/components/prompt.module.css'),
			'.root {}\n'
		);
		writeFileSync(
			join(packageDir, 'dist/styles/components/prompt.css'),
			'.c15t-ui-root-abc {}\n'
		);
		writeFileSync(
			join(packageDir, 'dist/styles/components/prompt.js'),
			classMap
		);
		writeFileSync(
			join(packageDir, 'dist/styles/components/prompt.d.ts'),
			'declare const styles: Record<string, string>;\nexport default styles;\n'
		);

		return packageDir;
	};

	const packedFiles = new Set([
		'dist/styles/components/prompt.css',
		'dist/styles/components/prompt.js',
		'dist/styles/components/prompt.d.ts',
	]);

	it('accepts CSS-free class maps', () => {
		const dir = createUiPackage(
			'const styles = { root: "c15t-ui-root-abc" };\nexport default styles;\n'
		);

		expect(scanUiComponentStyleArtifacts(dir, '@c15t/ui', packedFiles)).toEqual(
			[]
		);
	});

	it('rejects class maps that import their stylesheet', () => {
		// styles.css already carries these rules; the import made bundlers
		// emit them a second time.
		const dir = createUiPackage(
			'import "./prompt.css";\nconst styles = { root: "c15t-ui-root-abc" };\nexport default styles;\n'
		);

		expect(scanUiComponentStyleArtifacts(dir, '@c15t/ui', packedFiles)).toEqual(
			[
				expect.objectContaining({
					path: 'dist/styles/components/prompt.js',
					reason: 'component ESM class map must not import CSS',
				}),
			]
		);
	});
});
