import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Project, ts } from 'ts-morph';
import { describe, expect, it } from 'vitest';

import { generateSolidBoilerplate } from './solid';

const packages = fileURLToPath(new URL('../../../../../', import.meta.url));

describe('Solid boilerplate', () => {
	it.each(
		(['offline', 'hosted'] as const).flatMap((mode) => [
			{ mode, scripts: [] },
			{ mode, scripts: ['google-tag-manager'] },
		])
	)(
		'typechecks $mode controls with scripts $scripts against the local v3 source',
		({ mode, scripts }) => {
			const template = generateSolidBoilerplate({
				backendURL: 'https://consent.example.com',
				framework: 'solid',
				mode,
				scripts,
			});
			const project = new Project({
				compilerOptions: {
					jsx: ts.JsxEmit.Preserve,
					jsxImportSource: 'solid-js',
					module: ts.ModuleKind.ESNext,
					moduleResolution: ts.ModuleResolutionKind.Bundler,
					paths: {
						'@c15t/core': [path.join(packages, 'core/src/index.ts')],
						'@c15t/core/*': [path.join(packages, 'core/src/*')],
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
				if (/\.tsx?$/u.test(name)) {
					project.createSourceFile(
						path.join(packages, 'solid/.boilerplate-test', name),
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
	it('mounts browser behavior within Solid ownership and guards unsupported IAB', () => {
		const template = generateSolidBoilerplate({
			framework: 'solid',
			mode: 'offline',
			scripts: [],
		});
		const component = template.files['Consent.tsx'];
		expect(component).toContain('onMount(() =>');
		expect(component).toContain('owner.dispose()');
		expect(component).toContain("snapshot()?.model === 'iab'");
		expect(component).toContain('effectivePermissions');
		expect(template.dependencies).not.toContain('@c15t/solid');
	});
});
