import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import { validateBuildOutputs } from './ci-build-artifact';

it('requires every selected package and its exported types, even when another package built', () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-build-artifact-'));
	try {
		writeFileSync(
			join(root, 'package.json'),
			JSON.stringify({ workspaces: ['packages/*'] })
		);
		for (const name of ['first', 'second']) {
			mkdirSync(join(root, `packages/${name}/dist`), { recursive: true });
			writeFileSync(
				join(root, `packages/${name}/package.json`),
				JSON.stringify({
					exports: {
						'.': {
							import: './dist/index.js',
							types: './dist-types/index.d.ts',
						},
					},
					name,
				})
			);
		}
		writeFileSync(join(root, 'packages/first/dist/index.js'), 'export {};');
		mkdirSync(join(root, 'packages/first/dist-types'));
		writeFileSync(
			join(root, 'packages/first/dist-types/index.d.ts'),
			'export {};'
		);
		expect(() => validateBuildOutputs(['first'], root)).not.toThrow();
		expect(() => validateBuildOutputs(['first', 'second'], root)).toThrow(
			'second'
		);
		writeFileSync(join(root, 'packages/second/dist/index.js'), 'export {};');
		expect(() => validateBuildOutputs(['second'], root)).toThrow(
			'dist-types/index.d.ts'
		);
		writeFileSync(
			join(root, 'packages/second/package.json'),
			JSON.stringify({ exports: { './*': './dist/*.js' }, name: 'second' })
		);
		rmSync(join(root, 'packages/second/dist/index.js'));
		expect(() => validateBuildOutputs(['second'], root)).toThrow(
			'Missing wildcard build outputs'
		);
		writeFileSync(join(root, 'packages/second/dist/index.js'), 'export {};');
		expect(() => validateBuildOutputs(['second'], root)).not.toThrow();
		writeFileSync(
			join(root, 'packages/second/package.json'),
			JSON.stringify({
				exports: {
					'./*': { import: './dist/*.js', types: './dist-types/*.d.ts' },
				},
				name: 'second',
			})
		);
		expect(() => validateBuildOutputs(['second'], root)).toThrow(
			'dist-types/*.d.ts'
		);
		mkdirSync(join(root, 'packages/second/dist-types'));
		writeFileSync(
			join(root, 'packages/second/dist-types/index.d.ts'),
			'export {};'
		);
		expect(() => validateBuildOutputs(['second'], root)).not.toThrow();
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
});
