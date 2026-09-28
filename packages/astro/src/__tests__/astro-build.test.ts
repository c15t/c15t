/**
 * Builds a real Astro site and reads what reaches the page.
 *
 * The dialog islands load through an `import()` in the page script, and
 * whether Astro keeps the CSS those chunks import has changed between
 * versions: Astro 7 deletes it as unused. Only a real build shows which
 * stylesheets a page can reach, so this one runs Astro 7 itself.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import panelClasses from '@c15t/ui/styles/components/panel';
import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
import { afterAll, describe, expect, it } from 'vitest';

const FIXTURE = fileURLToPath(
	new URL('../../test/fixtures/astro-7', import.meta.url)
);

// The CLI rather than `build()` from `astro`: under this suite's Vite
// config, `astro` resolves to its browser stub. The fixture's config loads
// the built `@c15t/astro`, so run `build` before this file.
const ASTRO_CLI = join(
	dirname(createRequire(import.meta.url).resolve('astro/package.json')),
	'bin/astro.mjs'
);

const outDirs: string[] = [];

afterAll(async () => {
	await Promise.all(
		outDirs.map((dir) => rm(dir, { force: true, recursive: true }))
	);
});

/**
 * Build the fixture and return every stylesheet its page can reach: the ones
 * the HTML links or inlines, and the ones a script links at runtime by URL.
 *
 * @param ui - The dialog adapter to build with.
 * @returns The reachable CSS, concatenated.
 */
const buildReachableCSS = async function buildReachableCSS(
	ui: 'react' | 'svelte'
): Promise<string> {
	const outDir = await mkdtemp(join(tmpdir(), `c15t-astro-${ui}-`));
	outDirs.push(outDir);
	await promisify(execFile)(
		process.execPath,
		[ASTRO_CLI, 'build', '--root', FIXTURE, '--outDir', outDir],
		{
			env: {
				...process.env,
				ASTRO_TELEMETRY_DISABLED: '1',
				C15T_UI: ui,
				C15T_VITE_CACHE_DIR: join(outDir, '.vite'),
			},
		}
	);
	const html = await readFile(join(outDir, 'index.html'), 'utf8');
	const assets = await readdir(join(outDir, '_astro'));
	const scripts = await Promise.all(
		assets
			.filter((name) => name.endsWith('.js'))
			.map((name) => readFile(join(outDir, '_astro', name), 'utf8'))
	);
	const references = [html, ...scripts].join('\n');
	const reachable = assets.filter(
		(name) => name.endsWith('.css') && references.includes(name)
	);
	const inline = [
		...html.matchAll(/<style[^>]*>(?<css>[\s\S]*?)<\/style>/gu),
	].map((match) => match.groups?.css ?? '');
	const linked = await Promise.all(
		reachable.map((name) => readFile(join(outDir, '_astro', name), 'utf8'))
	);
	return [...linked, ...inline].join('\n');
};

describe('an Astro build', () => {
	// The dialog renders these class names; without rules for them it opens
	// as unstyled text at the bottom of the page.
	const dialogSelectors = [`.${panelClasses.root}`, `.${panelClasses.card}`];

	it('gives the React dialog its stylesheet', async () => {
		const css = await buildReachableCSS('react');
		for (const selector of dialogSelectors) {
			expect(css).toContain(selector);
		}
	}, 60_000);

	it('gives the Svelte dialog its stylesheets', async () => {
		const css = await buildReachableCSS('svelte');
		for (const selector of dialogSelectors) {
			expect(css).toContain(selector);
		}
		// The Svelte dialog also renders the primitive class maps.
		const [itemClass] = preferenceItemVariants().root().split(' ');
		expect(itemClass).toBeTruthy();
		expect(css).toContain(`.${itemClass}`);
	}, 60_000);
});
