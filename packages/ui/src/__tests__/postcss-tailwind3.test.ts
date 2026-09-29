import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AcceptedPlugin } from 'postcss';
import postcss from 'postcss';
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

	test('leaves no @layer in the built sheets the dialog and primitives load', async () => {
		// Both open with the layer order statement; Tailwind 3 has no layers
		// to order, so the plugin drops it along with the blocks.
		for (const file of ['dialog.css', 'primitives.css']) {
			const from = join(TEST_DIR, '..', '..', 'dist', 'styles', file);
			// oxlint-disable-next-line no-await-in-loop -- Two small files.
			const result = await postcss([tailwind3Plugin]).process(
				readFileSync(from, 'utf8'),
				{ from }
			);

			expect(result.css).toContain('.c15t-ui-');
			expect(result.css).not.toMatch(/@layer\b/u);
		}
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

	test('matches realistic package paths only', () => {
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
			isC15tUiStylesheetPath('/app/dist/styles/components/button.css')
		).toBe(false);
	});
});
