import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AcceptedPlugin } from 'postcss';
import postcss, { parse } from 'postcss';
import { describe, expect, test } from 'vitest';

import tailwind3Plugin, { isC15tUiStylesheetPath } from '../postcss-tailwind3';
import * as pluginModule from '../postcss-tailwind3';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));

const layeredCss = `
@layer theme, base, components, utilities;

:root {
	--c15t-color-primary: #0f172a;
}

@layer components {
	.c15t-ui-button-a1b2c {
		background: var(--c15t-color-primary);
	}
}

@layer utilities {
	.c15t-ui-force {
		color: red;
	}
}
`;

const processCss = async function processCss(from: string) {
	const result = await postcss([tailwind3Plugin]).process(layeredCss, { from });
	return result.css;
};

describe('@c15t/ui/postcss-tailwind3', () => {
	test('unwraps @layer blocks for built @c15t/ui stylesheets in node_modules', async () => {
		const css = await processCss(
			'/app/node_modules/@c15t/ui/dist/styles/components/button.css'
		);

		expect(css).toContain('.c15t-ui-button-a1b2c');
		expect(css).toContain('.c15t-ui-force');
		expect(css).not.toMatch(/@layer\b/u);
	});

	test('unwraps @layer blocks for built @c15t/ui stylesheets in the monorepo', async () => {
		const css = await processCss(
			'/repo/packages/ui/dist/styles/components/button.css'
		);

		expect(css).toContain('.c15t-ui-button-a1b2c');
		expect(css).not.toMatch(/@layer\b/u);
	});

	test('leaves app stylesheets untouched', async () => {
		const css = await processCss('/app/src/app/globals.css');

		expect(css).toContain('@layer theme, base, components, utilities');
		expect(css).toContain('@layer components');
		expect(css).toContain('@layer utilities');
	});

	test('removes bare @layer order statements for scoped c15t files', async () => {
		const css = await postcss([tailwind3Plugin]).process(
			'@layer properties, theme, base, components, utilities;',
			{ from: '/app/node_modules/@c15t/ui/dist/styles/components/button.css' }
		);

		expect(css.css.trim()).toBe('');
	});

	test('leaves no @layer in any built layered sheet', async () => {
		// Every layered sheet opens with the layer order statement; Tailwind 3
		// has no layers to order, so the plugin drops it along with the blocks.
		// The entrypoints matter most: apps import `styles.css` directly.
		for (const file of [
			'styles.css',
			'iab/styles.css',
			'styles/dialog.css',
			'styles/primitives.css',
		]) {
			const from = join(TEST_DIR, '..', '..', 'dist', file);
			// oxlint-disable-next-line no-await-in-loop -- Four small files.
			const result = await postcss([tailwind3Plugin]).process(
				readFileSync(from, 'utf8'),
				{ from }
			);

			expect(result.css, file).toContain('.c15t-ui-');
			expect(result.css, file).not.toMatch(/@layer\b/u);
		}
	});

	test('unwraps c15t rules inlined into an app stylesheet', async () => {
		// Vite and postcss-import inline `@import`ed files before other
		// plugins run. The inlined nodes keep their own source file, so the
		// plugin unwraps c15t's layers and leaves the app's own alone.
		const app = parse(
			'@tailwind components;\n@layer components { .app-card { color: red; } }',
			{ from: '/app/src/index.css' }
		);
		const inlined = parse(layeredCss, {
			from: '/app/node_modules/@c15t/ui/dist/styles.css',
		});
		app.append(inlined.nodes);

		const result = await postcss([tailwind3Plugin]).process(app, {
			from: '/app/src/index.css',
		});
		const layers = [...result.css.matchAll(/@layer [^{;]+/gu)].map((match) =>
			match[0].trim()
		);

		expect(layers).toEqual(['@layer components']);
		expect(result.css).toContain('.app-card');
		expect(result.css).toContain('.c15t-ui-button-a1b2c');
	});

	test('normalizes the in-process module namespace into a working plugin', async () => {
		// PostCSS (and Next's wrapper) unwrap a `postcss` property, so the
		// module namespace itself must normalize into a working plugin
		// without a CommonJS build.
		const result = await postcss([
			pluginModule as unknown as AcceptedPlugin,
		]).process(layeredCss, {
			from: '/app/node_modules/@c15t/ui/dist/styles/components/button.css',
		});

		expect(result.css).toContain('.c15t-ui-button-a1b2c');
		expect(result.css).not.toMatch(/@layer\b/u);
	});

	test('loads through a real require() of the built dist entry', () => {
		// Next.js `require()`s string plugin names from postcss.config.* and
		// receives the ESM namespace via require(esm). Drive that path for
		// real: a plain-Node subprocess (outside Vitest's Vite pipeline)
		// requires `@c15t/ui/postcss-tailwind3` against the built dist — the
		// turbo test task depends on build, so dist exists — and feeds the
		// result to postcss.
		const raw = execFileSync(
			process.execPath,
			[
				join(TEST_DIR, 'postcss-require-probe.mjs'),
				layeredCss,
				'/app/node_modules/@c15t/ui/dist/styles/components/button.css',
			],
			{ encoding: 'utf8' }
		);
		const { css } = JSON.parse(raw) as { css: string };

		expect(css).toContain('.c15t-ui-button-a1b2c');
		expect(css).toContain('.c15t-ui-force');
		expect(css).not.toMatch(/@layer\b/u);
	});

	test('unwraps c15t layers that an @import inlined into an app stylesheet', async () => {
		// Vite and postcss-import inline `@import '@c15t/svelte/styles.css'`
		// before Tailwind runs, so the root is the app's file and only the
		// inlined nodes remember that they came from c15t. Left layered,
		// Tailwind 3 adopts them as its own components layer and purges them.
		const root = parse(
			'@tailwind components;\n@layer components { .app-card { color: red; } }',
			{ from: '/app/src/app.css' }
		);
		root.prepend(
			parse(layeredCss, {
				from: '/app/node_modules/@c15t/ui/dist/styles.css',
			}).nodes
		);

		const { css } = await postcss([tailwind3Plugin]).process(root, {
			from: '/app/src/app.css',
		});

		expect(css).toContain('.c15t-ui-button-a1b2c');
		expect(css).not.toContain('@layer theme, base, components, utilities');
		expect(css.match(/@layer components/gu)).toHaveLength(1);
		expect(css).toMatch(/@layer components \{ \.app-card/u);
	});

	test('unwraps c15t layers inside an adapter stylesheet that imports @c15t/ui', async () => {
		// Astro injects `@c15t/astro/styles.css`, which opens with the layer
		// order and then imports `@c15t/ui/styles.css`.
		const from = '/app/node_modules/@c15t/astro/dist/styles.css';
		const root = parse(
			'@layer properties, theme, base, components, utilities;',
			{ from }
		);
		root.append(
			parse(layeredCss, {
				from: '/app/node_modules/@c15t/ui/dist/styles.css',
			}).nodes
		);

		const { css } = await postcss([tailwind3Plugin]).process(root, { from });

		expect(css).toContain('.c15t-ui-button-a1b2c');
		expect(css).not.toMatch(/@layer\b/u);
	});

	test('matches realistic package paths only', () => {
		for (const path of [
			'/app/node_modules/@c15t/ui/dist/styles.css',
			'/app/node_modules/.pnpm/@c15t+ui@3.0.0/node_modules/@c15t/ui/dist/styles/dialog.css',
			'/app/node_modules/@c15t/svelte/dist/styles.css',
			'/app/node_modules/@c15t/astro/dist/styles.css',
			'/app/node_modules/@c15t/browser/dist/c15t.css',
			'/app/node_modules/c15t/dist/react/styles.css',
			'/repo/packages/svelte/dist/styles.css',
			// Astro's Vite pipeline processes the dialog sheet with a query.
			'/app/node_modules/@c15t/ui/dist/styles/dialog.css?transform-only',
		]) {
			expect(isC15tUiStylesheetPath(path)).toBe(true);
		}
		for (const path of [
			'/app/node_modules/@other/ui/dist/styles.css',
			'/app/node_modules/c15t-theme/dist/styles.css',
			'/repo/packages/web/dist/styles.css',
			'/app/src/styles.css',
		]) {
			expect(isC15tUiStylesheetPath(path)).toBe(false);
		}
	});

	test('matches realistic @c15t/ui paths', () => {
		expect(
			isC15tUiStylesheetPath(
				'/app/node_modules/@c15t/ui/dist/styles/components/button.css'
			)
		).toBe(true);
		expect(
			isC15tUiStylesheetPath(
				'/repo/packages/ui/dist/styles/components/button.css'
			)
		).toBe(true);
		expect(
			isC15tUiStylesheetPath('/app/node_modules/@c15t/ui/dist/styles.css')
		).toBe(true);
		expect(
			isC15tUiStylesheetPath(
				'C:\\app\\node_modules\\@c15t\\ui\\dist\\iab\\styles.css'
			)
		).toBe(true);
		expect(
			isC15tUiStylesheetPath('/app/node_modules/@c15t/ui/dist/styles.tw3.css')
		).toBe(true);
		expect(
			isC15tUiStylesheetPath('/app/dist/styles/components/button.css')
		).toBe(false);
		expect(isC15tUiStylesheetPath('/app/dist/styles.css')).toBe(false);
		expect(
			isC15tUiStylesheetPath('/app/node_modules/@c15t/browser/dist/c15t.css')
		).toBe(true);
		expect(
			isC15tUiStylesheetPath(
				'/app/node_modules/@c15t/browser/dist/c15t.iab.css'
			)
		).toBe(true);
		expect(
			isC15tUiStylesheetPath('/app/node_modules/@c15t/browser/dist/c15t.js')
		).toBe(false);
		expect(
			isC15tUiStylesheetPath('/app/node_modules/other-ui/dist/styles.css')
		).toBe(false);
	});
});
