import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateBoilerplateTemplate } from '../../../generate';
import { mergeFile } from '../../../generate/merge';
import { inExample, typecheckInExample } from './__tests__/example-project';
import { generateSvelteBoilerplate } from './svelte';

const generate = (
	framework: 'svelte' | 'sveltekit',
	mode: 'offline' | 'hosted',
	scripts: string[]
) =>
	generateSvelteBoilerplate({
		backendURL: mode === 'hosted' ? 'https://your-project.inth.app' : undefined,
		framework,
		mode,
		scripts,
	});

describe('Svelte v3 boilerplate', () => {
	it.each([
		{
			component: 'src/App.svelte',
			framework: 'svelte',
			mode: ['src/App.svelte', 'mode={offline()}'],
		},
		{
			component: 'src/routes/+layout.svelte',
			framework: 'sveltekit',
			mode: ['src/hooks.server.ts', 'c15tHandle({ mode: offline() })'],
		},
	] as const)(
		'generates $framework wiring and current transport factories',
		({ component, framework, mode }) => {
			const result = generate(framework, 'offline', ['segment']);
			expect(result.dependencies).toEqual([
				'@c15t/svelte',
				'@c15t/integrations',
			]);
			const source = result.files[component];
			expect(source).toContain(
				'<ConsentDialogLink>Privacy settings</ConsentDialogLink>'
			);
			expect(source).toContain("segment({ writeKey: 'YOUR_WRITE_KEY' })");
			expect(source).not.toContain('ConsentManagerProvider');
			expect(source).not.toContain('ConsentDialogTrigger');
			expect(result.files[mode[0]]).toContain(mode[1]);
		}
	);

	it('requires an explicit hosted URL and quotes it as data', () => {
		expect(() =>
			generateBoilerplateTemplate({
				framework: 'svelte',
				mode: 'hosted',
				scripts: [],
			})
		).toThrow('--backend-url');
		const result = generateBoilerplateTemplate({
			backendURL: "https://consent.example/a'b",
			framework: 'sveltekit',
			mode: 'hosted',
			scripts: [],
		});
		expect(result.files['.env']).toBe(
			'PUBLIC_C15T_BACKEND_URL="https://consent.example/a\'b"\n'
		);
		expect(result.files['src/routes/+layout.svelte']).toContain(
			'<ConsentRoot state={data.consent}>'
		);
	});

	it('adds the locals type to an existing app.d.ts once', () => {
		const template = generate('sveltekit', 'hosted', []);
		const existing = 'declare global {\n\tnamespace App {}\n}\n\nexport {};\n';
		const merged = mergeFile(
			existing,
			template.files['src/app.d.ts'] ?? '',
			template.merge['src/app.d.ts']
		);
		expect(merged).toBe(
			`/// <reference types="@c15t/svelte/kit/locals" />\n${existing}`
		);
		expect(mergeFile(merged, '', template.merge['src/app.d.ts'])).toBe(merged);
	});

	it.each(['offline', 'hosted'] as const)(
		'compiles and server-renders %s against local Svelte source',
		async (mode) => {
			const svelte = generate('svelte', mode, ['segment']);
			expect(
				await typecheckInExample(
					'svelte',
					svelte.files,
					{ types: ['vite/client'], verbatimModuleSyntax: true },
					'svelte-check'
				)
			).toBe('');
			const kit = generate('sveltekit', mode, ['segment']);
			expect(
				await typecheckInExample(
					'sveltekit',
					kit.files,
					{ types: ['vite/client'], verbatimModuleSyntax: true },
					'svelte-check'
				)
			).toBe('');
			// Render the Svelte root, which needs no SvelteKit runtime. Its
			// offline policy resolves without a backend.
			const files = {
				...generate('svelte', 'offline', ['segment']).files,
				'src/render.ts':
					"import { render } from 'svelte/server';\nimport App from './App.svelte';\nexport const result = render(App);\n",
			};
			const output = await inExample('svelte', files, (directory) => {
				writeFileSync(
					join(directory, 'render.mjs'),
					`import assert from 'node:assert/strict';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createServer } from 'vite';
const server = await createServer({
	configFile: false, root: ${JSON.stringify(directory)}, logLevel: 'error',
	plugins: [svelte({ configFile: false })],
	resolve: { conditions: ['svelte', 'node'] },
	server: { middlewareMode: true },
	ssr: { noExternal: [/c15t/u, 'svelte'] },
});
try {
	const { result } = await server.ssrLoadModule('/src/render.ts');
	assert.ok(result.body.includes('Your app goes here.'), result.body);
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
});
