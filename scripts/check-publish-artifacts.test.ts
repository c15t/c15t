import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	getBlockedReason,
	scanUiComponentStyleArtifacts,
} from './check-publish-artifacts';

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
