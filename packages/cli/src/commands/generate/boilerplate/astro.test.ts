import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Project, ts } from 'ts-morph';
import { describe, expect, it } from 'vitest';

import { generateAstroBoilerplate } from './astro';

const packages = fileURLToPath(new URL('../../../../../', import.meta.url));
const astroRequire = createRequire(path.join(packages, 'astro/package.json'));
const compilerRequire = createRequire(
	astroRequire.resolve('astro/package.json')
);
const compiler: {
	transform: (
		source: string,
		options: { filename: string }
	) => Promise<{
		code: string;
		diagnostics: { severity: number; text: string }[];
	}>;
} = compilerRequire('@astrojs/compiler');

describe('Astro boilerplate', () => {
	it.each(
		(['offline', 'hosted'] as const).flatMap((mode) => [
			{ mode, scripts: [] },
			{ mode, scripts: ['google-tag-manager'] },
		])
	)(
		'typechecks the $mode integration with scripts $scripts against local v3 source',
		({ mode, scripts }) => {
			const template = generateAstroBoilerplate({
				backendURL: 'https://consent.example.com',
				framework: 'astro',
				mode,
				scripts,
			});
			const project = new Project({
				compilerOptions: {
					module: ts.ModuleKind.ESNext,
					moduleResolution: ts.ModuleResolutionKind.Bundler,
					paths: {
						'@c15t/astro': [path.join(packages, 'astro/src/index.ts')],
						'@c15t/scripts/google-tag-manager': [
							path.join(
								packages,
								'scripts/src/vendors/tag-managers/google-tag-manager.ts'
							),
						],
					},
					skipLibCheck: true,
					strict: true,
					target: ts.ScriptTarget.ESNext,
				},
			});
			for (const [name, source] of Object.entries(template.files)) {
				if (name.endsWith('.ts')) {
					project.createSourceFile(
						path.join(packages, 'astro/.boilerplate-test', name),
						source,
						{ overwrite: true }
					);
				}
			}
			const errors = project
				.getPreEmitDiagnostics()
				.filter((item) =>
					item.getSourceFile()?.getFilePath().includes('/.boilerplate-test/')
				);
			expect(project.formatDiagnosticsWithColorAndContext(errors)).toBe('');
		},
		30_000
	);
	it('compiles native Astro layout fragments and preserves script callbacks in the browser entrypoint', async () => {
		const template = generateAstroBoilerplate({
			framework: 'astro',
			mode: 'offline',
			scripts: ['google-tag-manager'],
		});
		const files = Object.entries(template.files).filter(([name]) =>
			name.endsWith('.astro')
		);
		const output = await Promise.all(
			files.map(([filename, source]) =>
				compiler.transform(source, { filename })
			)
		);
		for (const result of output) {
			expect(result.diagnostics.filter((item) => item.severity === 1)).toEqual(
				[]
			);
		}
		expect(template.files['consent-integration.ts']).toContain(
			'clientEntrypoint:'
		);
		expect(template.files['consent-integration.ts']).not.toContain(
			'googleTagManager('
		);
		expect(template.files['consent-client.ts']).toContain('googleTagManager(');
		expect(template.files['Consent.astro']).toContain(
			'<ConsentDialogTrigger>Privacy settings</ConsentDialogTrigger>'
		);
	});
});
