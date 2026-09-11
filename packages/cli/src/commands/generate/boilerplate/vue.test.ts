import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generateVueBoilerplate } from './vue';

const packageRoot = fileURLToPath(
	new URL('../../../../../vue/', import.meta.url)
);

describe('Vue v3 boilerplate', () => {
	it.each(['vue', 'nuxt'] as const)(
		'generates %s runtime ownership and wiring',
		(framework) => {
			const result = generateVueBoilerplate({
				framework,
				mode: 'offline',
				scripts: ['segment'],
			});
			expect(result.files['consent-runtime.ts']).toContain(
				'translations: context.translations'
			);
			expect(result.files['consent-runtime.ts']).toContain(
				"segment({ writeKey: 'YOUR_WRITE_KEY' })"
			);
			expect(result.files['install-consent.ts']).toContain('runtime.start()');
			expect(result.files['install-consent.ts']).toContain('showTrigger: true');
			expect(result.files['install-consent.ts']).toContain(
				'app.onUnmount(() => runtime.dispose())'
			);
			expect(Boolean(result.files['consent-plugin.client.ts'])).toBe(
				framework === 'nuxt'
			);
			expect(result.instructions.join('\n')).toContain(
				framework === 'nuxt' ? 'ClientOnly' : 'vite.config.ts'
			);
		}
	);

	it('requires hosted URL and keeps URLs as quoted data', () => {
		expect(() =>
			generateVueBoilerplate({ framework: 'vue', mode: 'hosted', scripts: [] })
		).toThrow('backend URL');
		const backendURL = 'https://consent.example/"quoted';
		const result = generateVueBoilerplate({
			backendURL,
			framework: 'vue',
			mode: 'hosted',
			scripts: [],
		});
		expect(result.files['consent-runtime.ts']).toContain(
			`hosted({ url: ${JSON.stringify(backendURL)} })`
		);
		expect(result.files['consent-runtime.ts']).toContain('scripts: []');
	});

	it.each([
		{ framework: 'vue', mode: 'offline' },
		{ framework: 'vue', mode: 'hosted' },
		{ framework: 'nuxt', mode: 'offline' },
		{ framework: 'nuxt', mode: 'hosted' },
	] as const)(
		'compiles and renders $framework $mode UI against local Vue source',
		async ({ framework, mode }) => {
			// Keep generated sources outside the framework's coverage file scan
			// while retaining resolution through its installed dependencies.
			const cache = resolve(packageRoot, 'node_modules/.cache');
			await mkdir(cache, { recursive: true });
			const directory = await mkdtemp(resolve(cache, 'c15t-cli-boilerplate-'));
			try {
				const template = generateVueBoilerplate({
					backendURL: 'https://consent.example',
					framework,
					mode,
					scripts: ['segment'],
				});
				await Promise.all(
					Object.entries(template.files).map(([name, content]) =>
						writeFile(resolve(directory, name), content)
					)
				);
				await writeFile(
					resolve(directory, 'verify.mjs'),
					`
import assert from 'node:assert/strict';
import ts from 'typescript';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import c15tVue from ${JSON.stringify(resolve(packageRoot, 'src/vite.ts'))};
const generatedFiles = ${JSON.stringify(['consent-runtime.ts', 'install-consent.ts', ...(framework === 'nuxt' ? ['consent-plugin.client.ts'] : [])])}.map(name => ${JSON.stringify(directory)} + '/' + name);
const program = ts.createProgram(generatedFiles, {
 strict: true, skipLibCheck: true, noEmit: true, types: ['vite/client'],
 target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
 moduleResolution: ts.ModuleResolutionKind.Bundler,
 paths: {
 '#app': [${JSON.stringify(resolve(packageRoot, 'node_modules/nuxt/dist/app/index.d.ts'))}],
 '@c15t/vue/vue-plugin': [${JSON.stringify(resolve(packageRoot, 'src/index.ts'))}],
 '@c15t/scripts/segment': [${JSON.stringify(resolve(packageRoot, '../scripts/src/vendors/analytics/segment.ts'))}],
 },
});
const errors = generatedFiles.flatMap(file => program.getSemanticDiagnostics(program.getSourceFile(file)));
assert.deepEqual(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, ' ')), []);
const server = await createServer({
 configFile: false, root: ${JSON.stringify(directory)}, logLevel: 'error',
 plugins: [${framework === 'vue' ? 'c15tVue(), ' : ''}vue()],
 resolve: { alias: [
  // The standalone fixture supplies Nuxt's #imports virtual while exercising the generated composables alias.
  { find: '#imports', replacement: ${JSON.stringify(resolve(packageRoot, 'src/runtime/vue/stubs.ts'))} },
  { find: '#c15t/composables', replacement: ${JSON.stringify(resolve(packageRoot, framework === 'nuxt' ? 'src/index.ts' : 'src/runtime/composables/index.ts'))} },
  { find: '@c15t/scripts/segment', replacement: ${JSON.stringify(resolve(packageRoot, '../scripts/src/vendors/analytics/segment.ts'))} },
  { find: '@c15t/vue/vue-plugin', replacement: ${JSON.stringify(resolve(packageRoot, 'src/index.ts'))} },
  { find: '@c15t/vue/consent-root', replacement: ${JSON.stringify(resolve(packageRoot, 'src/runtime/components/consent-root.vue'))} },
 ] },
 ssr: { noExternal: ['@c15t/ui'] },
});
await server.pluginContainer.buildStart({});
try {
 const { default: ConsentUI } = await server.ssrLoadModule('./consent-ui.vue');
 const { installConsent } = await server.ssrLoadModule('./install-consent.ts');
 const app = createSSRApp({ render: () => h('main', [h('p', 'Application content'), h(ConsentUI)]) });
 const runtime = installConsent(app);
 const other = installConsent(createSSRApp({render: () => null}));
 assert.notEqual(runtime.kernel, other.kernel);
 assert.equal(runtime.started, false);
 ${mode === 'offline' ? "await runtime.kernel.commands.init(); assert.equal(runtime.kernel.getSnapshot().resolution.status, 'matched'); assert.ok(runtime.kernel.getSnapshot().translations);" : ''}
 const html = await renderToString(app);
 assert.match(html, /Application content/);
 runtime.dispose(); other.dispose();
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
