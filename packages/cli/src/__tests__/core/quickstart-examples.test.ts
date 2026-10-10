import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { extractRegion } from '../../../../../scripts/example-doc-sources';
import { generateBoilerplateTemplate } from '../../generate';
import type { BoilerplateFramework, FileMerge } from '../../generate';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));

/** The demo backend every example's committed `.env` points at. */
const EXAMPLE_BACKEND_URL = 'https://example-inth.inth.app';
/** The placeholder the script-tag example loads c15t.js from. */
const SCRIPT_TAG_BACKEND_URL = 'https://your-project.inth.app';

/**
 * Where a generated file's published version lives.
 * - `region`: a `#region docs:<name>` block, compared with the whole file,
 *   with an inserted snippet when the generator adds to a file, or with
 *   the start of the file for a partial region (`prefix`).
 * - `file`: a whole example file without a region.
 * - `env`: the example's `.env`, without its comments.
 */
type Source =
	| { example: string; region: string; insert?: number; prefix?: true }
	| { example: string; file: true }
	| { example: string; env: true };

const quickstarts: {
	framework: BoilerplateFramework;
	backendURL?: string;
	files: Record<string, Source>;
}[] = [
	{
		files: {
			'.env': { env: true, example: 'nextjs/.env' },
			'app/layout.tsx': {
				example: 'nextjs/app/layout.tsx',
				region: 'quickstart-layout',
			},
			'c15t.config.ts': {
				example: 'nextjs/c15t.config.ts',
				region: 'quickstart-config',
			},
			'next.config.ts': {
				example: 'nextjs/next.config.ts',
				region: 'quickstart-next-config',
			},
		},
		framework: 'next-app',
	},
	{
		files: {
			'.env': { env: true, example: 'nextjs-pages-router/.env' },
			'c15t.config.ts': {
				example: 'nextjs-pages-router/c15t.config.ts',
				region: 'pages-config',
			},
			'next.config.ts': {
				example: 'nextjs-pages-router/next.config.ts',
				file: true,
			},
			'pages/_app.tsx': {
				example: 'nextjs-pages-router/pages/_app.tsx',
				region: 'pages-app',
			},
			'pages/api/c15t/[...c15t].ts': {
				example: 'nextjs-pages-router/pages/api/c15t/[...c15t].ts',
				region: 'pages-consent-route',
			},
			'pages/index.tsx': {
				example: 'nextjs-pages-router/pages/index.tsx',
				prefix: true,
				region: 'pages-ssr',
			},
		},
		framework: 'next-pages',
	},
	{
		files: {
			'.env': { env: true, example: 'nuxt/.env' },
			'app/app.config.ts': {
				example: 'nuxt/app/app.config.ts',
				region: 'app-config',
			},
			'app/app.vue': { example: 'nuxt/app/app.vue', region: 'root' },
			'nuxt.config.ts': {
				example: 'nuxt/nuxt.config.ts',
				region: 'nuxt-config',
			},
		},
		framework: 'nuxt',
	},
	{
		files: {
			'.env': { env: true, example: 'tanstack-start/.env' },
			'src/routes/__root.tsx': {
				example: 'tanstack-start/src/routes/__root.tsx',
				region: 'root',
			},
			'vite.config.ts': {
				example: 'tanstack-start/vite.config.ts',
				region: 'vite-config',
			},
		},
		framework: 'tanstack-start',
	},
	{
		files: {
			'.env': { env: true, example: 'astro/.env' },
			'astro.config.mjs': {
				example: 'astro/astro.config.mjs',
				region: 'server-config',
			},
			'src/c15t.client.ts': {
				example: 'astro/src/c15t.client.ts',
				region: 'client-entrypoint',
			},
			'src/layouts/base.astro': {
				example: 'astro/src/layouts/base.astro',
				region: 'layout',
			},
		},
		framework: 'astro',
	},
	{
		files: {
			'.env': { env: true, example: 'astro-static/.env' },
			'astro.config.mjs': {
				example: 'astro-static/astro.config.mjs',
				region: 'static-config',
			},
			'src/c15t.client.ts': {
				example: 'astro-static/src/c15t.client.ts',
				file: true,
			},
			'src/layouts/base.astro': {
				example: 'astro-static/src/layouts/base.astro',
				file: true,
			},
		},
		framework: 'astro-static',
	},
	{
		files: {
			'.env': { env: true, example: 'react/.env' },
			'src/consent.tsx': {
				example: 'react/src/consent.tsx',
				region: 'consent',
			},
			'src/main.tsx': { example: 'react/src/main.tsx', region: 'main' },
			'vite.config.ts': {
				example: 'react/vite.config.ts',
				region: 'vite-config',
			},
		},
		framework: 'react',
	},
	{
		files: {
			'.env': { env: true, example: 'javascript/.env' },
			'index.html': {
				example: 'javascript/index.html',
				insert: 0,
				region: 'preferences-link',
			},
			'src/main.ts': { example: 'javascript/src/main.ts', region: 'init' },
			'vite.config.ts': {
				example: 'javascript/vite.config.ts',
				region: 'vite-config',
			},
		},
		framework: 'javascript',
	},
	{
		backendURL: SCRIPT_TAG_BACKEND_URL,
		files: {
			// The head snippet is checked below, with the vendor script.
			'index.html': {
				example: 'html/index.html',
				insert: 1,
				region: 'preferences-link',
			},
		},
		framework: 'html',
	},
	{
		files: {
			'.env': { env: true, example: 'vue/.env' },
			'src/App.vue': { example: 'vue/src/App.vue', region: 'app' },
			'src/main.ts': { example: 'vue/src/main.ts', region: 'main' },
			'vite.config.ts': {
				example: 'vue/vite.config.ts',
				region: 'vite-config',
			},
		},
		framework: 'vue',
	},
	{
		files: {
			'.env': { env: true, example: 'svelte/.env' },
			'src/App.svelte': { example: 'svelte/src/App.svelte', region: 'app' },
			'vite.config.ts': {
				example: 'svelte/vite.config.ts',
				region: 'vite-config',
			},
		},
		framework: 'svelte',
	},
	{
		files: {
			'.env': { env: true, example: 'sveltekit/.env' },
			'src/app.d.ts': {
				example: 'sveltekit/src/app.d.ts',
				insert: 0,
				region: 'app-locals',
			},
			'src/hooks.server.ts': {
				example: 'sveltekit/src/hooks.server.ts',
				region: 'hooks',
			},
			'src/routes/+layout.server.ts': {
				example: 'sveltekit/src/routes/+layout.server.ts',
				region: 'layout-server',
			},
			'src/routes/+layout.svelte': {
				example: 'sveltekit/src/routes/+layout.svelte',
				region: 'layout',
			},
			'vite.config.ts': {
				example: 'sveltekit/vite.config.ts',
				region: 'vite-config',
			},
		},
		framework: 'sveltekit',
	},
];

const read = (example: string): string =>
	readFileSync(`${root}examples/${example}`, 'utf8');

/** The published text a generated file or snippet must equal. */
const published = (source: Source): string => {
	const content = read(source.example);
	if ('env' in source) {
		return `${content
			.split('\n')
			.filter((line) => line && !line.startsWith('#'))
			.join('\n')}\n`;
	}
	if ('file' in source) {
		return content;
	}
	const region = extractRegion(
		content,
		source.region,
		`examples/${source.example}`
	);
	if (source.prefix) {
		return `${region}\n\n`;
	}
	return source.insert === undefined ? `${region}\n` : region;
};

const insertContent = (merge: FileMerge | undefined, index: number) =>
	merge?.type === 'insert' ? merge.inserts[index]?.content : undefined;

describe('framework quickstarts match the examples the docs publish', () => {
	it.each(quickstarts)(
		'$framework writes exactly the example files',
		({ backendURL = EXAMPLE_BACKEND_URL, files, framework }) => {
			const template = generateBoilerplateTemplate({
				backendURL,
				framework,
				mode: 'hosted',
				scripts: ['posthog'],
			});
			expect(Object.keys(template.files).toSorted()).toEqual(
				Object.keys(files).toSorted()
			);
			for (const [name, source] of Object.entries(files)) {
				const expected = published(source);
				let actual = template.files[name];
				if ('insert' in source && source.insert !== undefined) {
					actual = insertContent(template.merge[name], source.insert);
				} else if ('prefix' in source && source.prefix) {
					actual = actual?.slice(0, expected.length);
				}
				expect(actual, `${framework} ${name}`).toBe(expected);
			}
		}
	);

	it('places each generated snippet where the example has it', () => {
		const html = generateBoilerplateTemplate({
			backendURL: SCRIPT_TAG_BACKEND_URL,
			framework: 'html',
			mode: 'hosted',
			scripts: ['posthog'],
		});
		const merge = html.merge['index.html'];
		expect(merge?.type === 'insert' && merge.inserts).toEqual([
			{
				before: '</head>',
				content: [
					extractRegion(read('html/index.html'), 'script-tag', 'html'),
					extractRegion(read('html/index.html'), 'vendor-scripts', 'html'),
				].join('\n'),
			},
			{
				before: '</body>',
				content: extractRegion(
					read('html/index.html'),
					'preferences-link',
					'html'
				),
			},
		]);
	});
});
