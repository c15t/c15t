import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generateSvelteBoilerplate } from './svelte';

const packageRoot = fileURLToPath(
	new URL('../../../../../svelte/', import.meta.url)
);

describe('Svelte v3 boilerplate', () => {
	it.each(['svelte', 'sveltekit'] as const)(
		'generates %s wiring and current transport factories',
		(framework) => {
			const result = generateSvelteBoilerplate({
				framework,
				mode: 'offline',
				scripts: ['segment'],
			});
			expect(result.dependencies).toEqual(['@c15t/svelte', '@c15t/scripts']);
			expect(result.files['consent-provider.svelte']).toContain(
				'<ConsentDialogTrigger />'
			);
			expect(result.files['consent-options.ts']).toContain(
				"segment({ writeKey: 'YOUR_WRITE_KEY' })"
			);
			expect(result.files['consent-options.ts']).toContain(
				'offline({ policyRules:'
			);
			expect(result.instructions.join('\n')).toContain(
				framework === 'sveltekit' ? '+layout.svelte' : 'App.svelte'
			);
		}
	);

	it('requires an explicit hosted URL and quotes it as data', () => {
		expect(() =>
			generateSvelteBoilerplate({
				framework: 'svelte',
				mode: 'hosted',
				scripts: [],
			})
		).toThrow('backend URL');
		const backendURL = 'https://consent.example/"quoted';
		const result = generateSvelteBoilerplate({
			backendURL,
			framework: 'svelte',
			mode: 'hosted',
			scripts: [],
		});
		expect(result.files['consent-options.ts']).toContain(
			`hosted({ url: ${JSON.stringify(backendURL)} })`
		);
		expect(result.files['consent-options.ts']).toContain('scripts: []');
	});

	it.each(['offline', 'hosted'] as const)(
		'compiles and server-renders %s against local Svelte source',
		async (mode) => {
			const directory = await mkdtemp(
				resolve(packageRoot, '.cli-boilerplate-')
			);
			try {
				const template = generateSvelteBoilerplate({
					backendURL: 'https://consent.example',
					framework: 'sveltekit',
					mode,
					scripts: ['segment'],
				});
				await Promise.all(
					Object.entries(template.files).map(([name, content]) =>
						writeFile(resolve(directory, name), content)
					)
				);
				await writeFile(
					resolve(directory, 'entry.svelte'),
					`<script>import ConsentProvider from './consent-provider.svelte';</script><ConsentProvider><p>Application content</p></ConsentProvider>`
				);
				await writeFile(
					resolve(directory, 'render.ts'),
					"import { render } from 'svelte/server'; import Component from './entry.svelte'; export const result = render(Component);"
				);
				await writeFile(
					resolve(directory, 'verify.mjs'),
					`
import assert from 'node:assert/strict';
import ts from 'typescript';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
const generatedFiles = ['consent-options.ts'].map(name => ${JSON.stringify(directory)} + '/' + name);
const program = ts.createProgram(generatedFiles, {
 strict: true, skipLibCheck: true, noEmit: true, types: ['vite/client'],
 target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
 moduleResolution: ts.ModuleResolutionKind.Bundler,
 paths: {
 '@c15t/svelte': [${JSON.stringify(resolve(packageRoot, 'src/lib/index.ts'))}],
 '@c15t/scripts/segment': [${JSON.stringify(resolve(packageRoot, '../scripts/src/vendors/analytics/segment.ts'))}],
 },
});
const errors = generatedFiles.flatMap(file => program.getSemanticDiagnostics(program.getSourceFile(file)));
assert.deepEqual(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, ' ')), []);
const server = await createServer({
 configFile: false, root: ${JSON.stringify(directory)}, logLevel: 'error',
 plugins: [svelte({ configFile: false })],
 resolve: { conditions: ['svelte', 'node'], alias: [
  { find: '@c15t/scripts/segment', replacement: ${JSON.stringify(resolve(packageRoot, '../scripts/src/vendors/analytics/segment.ts'))} },
  { find: '@c15t/svelte/styles.css', replacement: ${JSON.stringify(resolve(packageRoot, 'src/styles.css'))} },
  { find: '@c15t/svelte', replacement: ${JSON.stringify(resolve(packageRoot, 'src/lib/index.ts'))} },
 ] },
 ssr: { noExternal: ['svelte', '@c15t/svelte', '@c15t/ui'] },
});
await server.pluginContainer.buildStart({});
try {
 const { result } = await server.ssrLoadModule('./render.ts');
 assert.match(result.body, /Application content/);
 console.log('rendered');
} finally { await server.close(); }
`
				);
				const output = execFileSync('bun', [resolve(directory, 'verify.mjs')], {
					cwd: packageRoot,
					encoding: 'utf8',
					timeout: 60_000,
				});
				expect(output).toContain('rendered');
			} finally {
				await rm(directory, { force: true, recursive: true });
			}
		},
		120_000
	);
});
