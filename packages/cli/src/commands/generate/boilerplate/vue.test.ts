import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateBoilerplateTemplate } from '../../../generate';
import { inExample, typecheckInExample } from './__tests__/example-project';
import { generateVueBoilerplate } from './vue';

const generate = (
	framework: 'vue' | 'nuxt',
	mode: 'offline' | 'hosted',
	scripts: string[]
) =>
	generateVueBoilerplate({
		backendURL: mode === 'hosted' ? 'https://your-project.inth.app' : undefined,
		framework,
		mode,
		scripts,
	});

/** Nuxt's auto-imported config helpers, typed by the c15t module. */
const NUXT_GLOBALS = `declare function defineNuxtConfig(config: {
	c15t?: import('c15t/vue').ModuleOptions;
	compatibilityDate?: string;
	modules?: string[];
}): unknown;
declare function defineAppConfig(config: {
	c15t?: import('c15t/vue').C15tNuxtAppConfig;
}): unknown;
`;

describe('Vue v3 boilerplate', () => {
	it.each(['vue', 'nuxt'] as const)(
		'generates %s quickstart files and wiring',
		(framework) => {
			const result = generate(framework, 'offline', ['segment']);
			const scripts =
				result.files[
					framework === 'nuxt' ? 'app/app.config.ts' : 'src/main.ts'
				];
			expect(scripts).toContain("segment({ writeKey: 'YOUR_WRITE_KEY' })");
			expect(Object.keys(result.files).toSorted()).toEqual(
				framework === 'nuxt'
					? ['app/app.config.ts', 'app/app.vue', 'nuxt.config.ts']
					: ['src/App.vue', 'src/main.ts', 'vite.config.ts']
			);
			const root =
				result.files[framework === 'nuxt' ? 'app/app.vue' : 'src/App.vue'];
			expect(root).toContain('<ConsentRoot />');
			expect(root).toContain(
				'<ConsentDialogLink>Privacy settings</ConsentDialogLink>'
			);
			expect(result.dependencies).toEqual(['c15t', '@c15t/integrations']);
		}
	);

	it('requires hosted URL and keeps URLs as quoted data', () => {
		expect(() =>
			generateBoilerplateTemplate({
				framework: 'vue',
				mode: 'hosted',
				scripts: [],
			})
		).toThrow('--backend-url');
		const result = generateBoilerplateTemplate({
			backendURL: "https://consent.example/a'b#c",
			framework: 'nuxt',
			mode: 'hosted',
			scripts: [],
		});
		expect(result.files['.env']).toBe(
			'NUXT_PUBLIC_C15T_BACKEND_URL="https://consent.example/a\'b#c"\n'
		);
		// The module reads the URL from the env var; config holds no copy.
		expect(result.files['nuxt.config.ts']).not.toContain('consent.example');
		expect(result.files['app/app.config.ts']).toBeUndefined();
	});

	it.each(['offline', 'hosted'] as const)(
		'typechecks the Nuxt %s config against the module types',
		async (mode) => {
			const template = generate('nuxt', mode, ['segment']);
			expect(
				await typecheckInExample(
					'nuxt',
					{ ...template.files, 'nuxt-globals.d.ts': NUXT_GLOBALS },
					{ types: ['node'] }
				)
			).toBe('');
		},
		60_000
	);

	it.each(['offline', 'hosted'] as const)(
		'compiles and renders the Vue %s UI against local Vue source',
		async (mode) => {
			const template = generate('vue', mode, ['segment']);
			expect(
				await typecheckInExample(
					'vue',
					template.files,
					{ types: ['vite/client'] },
					'vue-tsc'
				)
			).toBe('');
			// Render the generated root with the plugin options main.ts passes.
			// App.vue is the same in both modes. Render it with the offline
			// policy, which needs no backend on the server.
			const factory = 'offline';
			const files = {
				...template.files,
				// main.ts mounts in a browser; render the root with the plugin here.
				'src/render.ts': `import { c15tVue, ${factory} } from 'c15t/vue/vue-plugin';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import App from './App.vue';

export const render = () =>
	renderToString(createSSRApp(App).use(c15tVue, { mode: ${factory}() }));
`,
			};
			const output = await inExample('vue', files, (directory) => {
				writeFileSync(
					join(directory, 'render.mjs'),
					`import assert from 'node:assert/strict';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { consentManifest } from 'c15t/vue/vite';
const server = await createServer({
	configFile: false, root: ${JSON.stringify(directory)}, logLevel: 'error',
	plugins: [vue(), consentManifest({ onBuildError: 'runtime' })],
	server: { middlewareMode: true },
	ssr: { noExternal: [/c15t/u] },
});
try {
	const { render } = await server.ssrLoadModule('/src/render.ts');
	// The link and banner render once the browser knows the policy.
	const html = await render();
	assert.ok(html.includes('<main><h1>c15t with Vue</h1>'), html);
	assert.ok(html.includes('<footer>'), html);
	console.log('rendered');
} finally { await server.close(); }
`
				);
				return execFileSync(process.execPath, [join(directory, 'render.mjs')], {
					cwd: directory,
					encoding: 'utf8',
					killSignal: 'SIGKILL',
					timeout: 60_000,
				});
			});
			expect(output).toContain('rendered');
		},
		120_000
	);

	it('offline mode uses the plugin entry offline() with its recommended policy', () => {
		const vue = generate('vue', 'offline', []);
		expect(vue.files['src/main.ts']).toContain(
			"import { c15tVue, offline } from 'c15t/vue/vue-plugin';"
		);
		expect(vue.files['src/main.ts']).toContain('mode: offline(),');
		expect(vue.files['vite.config.ts']).toContain(
			"consentManifest({ onBuildError: 'runtime' })"
		);
		const nuxt = generate('nuxt', 'offline', []);
		expect(nuxt.files['nuxt.config.ts']).toContain(
			"import { offline } from 'c15t/vue';"
		);
		expect(nuxt.files['nuxt.config.ts']).toContain(
			'c15t: { mode: offline() },'
		);
	});
});
