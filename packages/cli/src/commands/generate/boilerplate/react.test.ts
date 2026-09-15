import { spawnSync } from 'node:child_process';
import {
	mkdtempSync,
	mkdirSync,
	symlinkSync,
	writeFileSync,
	rmSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateJavaScriptBoilerplate } from './javascript';
import { generateReactBoilerplate } from './react';
import type { BoilerplateFramework } from './types';

describe('React, Next.js and JavaScript boilerplate', () => {
	it('typechecks both modes and script integration against built local v3 packages', () => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-boilerplate-types-'));
		const packages = resolve(import.meta.dirname, '../../../../..');
		const require = createRequire(join(packages, 'react/package.json'));
		try {
			mkdirSync(join(root, 'node_modules/@c15t'), { recursive: true });
			for (const [name, directory] of Object.entries({
				core: 'core',
				nextjs: 'nextjs',
				react: 'react',
				scripts: 'scripts',
			})) {
				symlinkSync(
					join(packages, directory),
					join(root, 'node_modules/@c15t', name)
				);
			}
			mkdirSync(join(root, 'node_modules/@types'), { recursive: true });
			symlinkSync(
				dirname(require.resolve('@types/react/package.json')),
				join(root, 'node_modules/@types/react')
			);
			symlinkSync(
				dirname(require.resolve('react/package.json')),
				join(root, 'node_modules/react')
			);
			const frameworks: BoilerplateFramework[] = [
				'react',
				'next-app',
				'next-pages',
				'javascript',
			];
			for (const framework of frameworks) {
				for (const mode of ['offline', 'hosted'] as const) {
					const options = {
						backendURL: "https://example.com/a'b",
						framework,
						mode,
						scripts: ['google-tag'],
					};
					const template =
						framework === 'javascript'
							? generateJavaScriptBoilerplate(options)
							: generateReactBoilerplate(options);
					for (const [file, content] of Object.entries(template.files)) {
						writeFileSync(join(root, `${framework}-${mode}-${file}`), content);
					}
				}
			}
			writeFileSync(join(root, 'env.d.ts'), "declare module '*.css';\n");
			writeFileSync(
				join(root, 'tsconfig.json'),
				JSON.stringify({
					compilerOptions: {
						jsx: 'react-jsx',
						module: 'ESNext',
						moduleResolution: 'Bundler',
						noEmit: true,
						skipLibCheck: true,
						strict: true,
						target: 'ES2022',
						types: ['react'],
					},
					include: ['*.ts', '*.tsx'],
				})
			);
			const cliRequire = createRequire(import.meta.url);
			const compiler = join(
				dirname(cliRequire.resolve('typescript/package.json')),
				'bin/tsc'
			);
			const result = spawnSync(
				process.execPath,
				[
					compiler,
					'--project',
					join(root, 'tsconfig.json'),
					'--pretty',
					'false',
				],
				{ encoding: 'utf8', timeout: 30_000 }
			);
			expect(result.status, result.stdout + result.stderr).toBe(0);
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	}, 40_000);
});
