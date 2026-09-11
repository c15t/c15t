import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Project, ts } from 'ts-morph';
import { describe, expect, it } from 'vitest';

import { generateTanStackStartBoilerplate } from './tanstack-start';

const packages = fileURLToPath(new URL('../../../../../', import.meta.url));

describe('TanStack Start boilerplate', () => {
	it.each(['offline', 'hosted'] as const)(
		'typechecks the %s boundary and server function against local v3 source',
		(mode) => {
			const template = generateTanStackStartBoilerplate({
				backendURL: 'https://consent.example.com',
				framework: 'tanstack-start',
				mode,
				scripts: ['google-tag-manager'],
			});
			const project = new Project({
				compilerOptions: {
					jsx: ts.JsxEmit.ReactJSX,
					module: ts.ModuleKind.ESNext,
					moduleResolution: ts.ModuleResolutionKind.Bundler,
					paths: {
						'@c15t/scripts/google-tag-manager': [
							path.join(
								packages,
								'scripts/src/vendors/tag-managers/google-tag-manager.ts'
							),
						],
						'@c15t/tanstack-start': [
							path.join(packages, 'tanstack-start/src/index.ts'),
						],
						'@c15t/tanstack-start/*': [
							path.join(packages, 'tanstack-start/src/*'),
						],
					},
					skipLibCheck: true,
					strict: true,
					target: ts.ScriptTarget.ESNext,
				},
			});
			for (const [name, source] of Object.entries(template.files)) {
				project.createSourceFile(
					path.join(packages, 'tanstack-start/.boilerplate-test', name),
					source,
					{ overwrite: true }
				);
			}
			const errors = project
				.getPreEmitDiagnostics()
				.filter((item) =>
					item.getSourceFile()?.getFilePath().includes('/.boilerplate-test/')
				);
			expect(project.formatDiagnosticsWithColorAndContext(errors)).toBe('');
		}
	);
	it('does not assume that the app mounts the optional init proxy', () => {
		const template = generateTanStackStartBoilerplate({
			backendURL: 'https://consent.example.com',
			framework: 'tanstack-start',
			mode: 'hosted',
			scripts: [],
		});
		expect(template.files['Consent.tsx']).toContain('initRoute={false}');
		expect(template.files['consent-server.ts']).toContain(
			'createServerFn({ method:'
		);
		expect(template.instructions.join('\n')).toContain('Route.useLoaderData()');
	});
});
