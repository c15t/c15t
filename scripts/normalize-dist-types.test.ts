import { execFileSync, spawnSync } from 'node:child_process';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, expect, test } from 'vitest';

const directories: string[] = [];
const parserDirectory = dirname(
	fileURLToPath(import.meta.resolve('@babel/parser/package.json'))
);
const compiler = fileURLToPath(
	new URL('./bin/tsc', import.meta.resolve('typescript/package.json'))
);

afterEach(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

/** Build an isolated ESM workspace for the script and declaration consumers. */
const fixture = function fixture() {
	const root = mkdtempSync(join(tmpdir(), 'normalize-types-'));
	directories.push(root);
	const write = (name: string, content: string) => {
		const path = join(root, name);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, content);
	};
	write('package.json', JSON.stringify({ private: true, type: 'module' }));
	mkdirSync(join(root, 'node_modules/@babel'), { recursive: true });
	symlinkSync(parserDirectory, join(root, 'node_modules/@babel/parser'), 'dir');
	for (const name of ['core', 'shared']) {
		write(
			`packages/${name}/package.json`,
			JSON.stringify({
				exports: {
					'.': { types: './dist-types/index.d.ts' },
					'./extra': { types: './dist-types/extra.d.ts' },
				},
				name: `@fixture/${name}`,
				type: 'module',
			})
		);
		mkdirSync(join(root, 'node_modules/@fixture'), { recursive: true });
		symlinkSync(
			join(root, 'packages', name),
			join(root, 'node_modules/@fixture', name),
			'dir'
		);
	}
	write(
		'packages/core/dist-types/index.d.ts',
		[
			"import './ambient';",
			"export * from './client';",
			"export type { Options } from './client/types';",
			"export type LazyOptions = import('./client/types').Options;",
			"export type ExistingOptions = import('./client/types.js').Options;",
			"export type { Shared } from '../../shared/dist-types';",
			"export type { Extra } from '../../shared/dist-types/extra.js';",
		].join('\n')
	);
	write(
		'packages/core/dist-types/client/index.d.ts',
		"import type { Options } from './types';\nexport declare function configure(options: Options): { value: string };"
	);
	write(
		'packages/core/dist-types/client/types.d.ts',
		'export interface Options { value: string }'
	);
	write(
		'packages/core/dist-types/ambient.d.ts',
		'export {}; declare global { interface FixtureAmbient { enabled: boolean } }'
	);
	write(
		'packages/shared/dist-types/index.d.ts',
		'export interface Shared { value: string }'
	);
	write(
		'packages/shared/dist-types/extra.d.ts',
		'export interface Extra { extra: boolean }'
	);
	write(
		'consumer.ts',
		[
			"import { configure, type Options, type LazyOptions, type ExistingOptions, type Shared, type Extra } from '@fixture/core';",
			"const options: Options & LazyOptions & ExistingOptions & Shared = { value: 'ok' };",
			'const extra: Extra = { extra: true };',
			'const ambient: FixtureAmbient = { enabled: true };',
			'configure(options).value.toUpperCase();',
			'void extra; void ambient;',
			'// @ts-expect-error invalid options must still be rejected',
			'configure({ nonexistent: true });',
			'// @ts-expect-error the returned API must retain its types',
			'configure(options).nonexistent();',
		].join('\n')
	);
	const script = join(root, 'scripts/normalize-dist-types.mjs');
	mkdirSync(dirname(script), { recursive: true });
	copyFileSync(new URL('./normalize-dist-types.mjs', import.meta.url), script);
	return {
		normalize() {
			execFileSync(process.execPath, [script], {
				cwd: join(root, 'packages/core'),
			});
		},
		root,
		write,
	};
};

test.each([
	['Node16', 'Node16', false],
	['NodeNext', 'NodeNext', false],
	['NodeNext', 'NodeNext', true],
	['bundler', 'preserve', false],
])('normalized declarations retain consumer types with %s / %s, skipLibCheck = %s', (moduleResolution, module, skipLibCheck) => {
	const project = fixture();
	project.write(
		'tsconfig.json',
		JSON.stringify({
			compilerOptions: {
				module,
				moduleResolution,
				noEmit: true,
				noUncheckedSideEffectImports: true,
				skipLibCheck,
				strict: true,
				types: [],
			},
			files: ['consumer.ts'],
		})
	);
	project.normalize();
	const { status, stdout, stderr } = spawnSync(
		process.execPath,
		[compiler, '--project', join(project.root, 'tsconfig.json')],
		{ encoding: 'utf8' }
	);
	expect({ status, stderr, stdout }).toEqual({
		status: 0,
		stderr: '',
		stdout: '',
	});
});

test('normalizing explicit specifiers again leaves declarations unchanged', () => {
	const project = fixture();
	project.normalize();
	const entry = join(project.root, 'packages/core/dist-types/index.d.ts');
	const normalized = readFileSync(entry, 'utf8');
	project.normalize();
	expect(readFileSync(entry, 'utf8')).toBe(normalized);
});

test('preserves import-like literals and comments when rewriting module syntax', () => {
	const project = fixture();
	const preserved = [
		`/** Example: import './ambient'; export * from './client'; */`,
		`// import('./client/types')`,
		`export type Statement = "import './ambient'";`,
		`export type ExportStatement = "export * from './client'";`,
		`export type ImportQuery = "import('./client/types')";`,
		"export type Template = `import './ambient'`;",
	];
	project.write(
		'packages/core/dist-types/literals.d.ts',
		[
			...preserved,
			`import /* module */ './ambient';`,
			`export type { Options } from /* module */ './client/types';`,
			`declare namespace Nested { type Value = import('./client/types').Options; }`,
		].join('\n')
	);
	project.normalize();
	expect(
		readFileSync(
			join(project.root, 'packages/core/dist-types/literals.d.ts'),
			'utf8'
		)
	).toBe(
		[
			...preserved,
			`import /* module */ './ambient.js';`,
			`export type { Options } from /* module */ './client/types.js';`,
			`declare namespace Nested { type Value = import('./client/types.js').Options; }`,
		].join('\n')
	);
});
