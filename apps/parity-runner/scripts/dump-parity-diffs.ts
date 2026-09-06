/**
 * Dump per-pair DOM / a11y / computed-style snapshots for react vs vue so
 * the differences can be fixed without re-running the whole suite.
 * Usage: bunx tsx scripts/dump-parity-diffs.ts (storybooks must be running)
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { chromium, request } from '@playwright/test';

import { captureA11yTree } from '../src/diff-a11y';
import { captureComputedStyleMap } from '../src/diff-computed-style';
import { captureDomSnapshot } from '../src/diff-dom';
import { frameworkOf, pairStories } from '../src/pair-stories';
import type { StoryEntry } from '../src/pair-stories';
import { markSurfaceRoots, SURFACE_SCOPE_SELECTOR } from '../src/surface-scope';

const URLS: Record<string, string> = {
	react: 'http://127.0.0.1:6006',
	vue: 'http://127.0.0.1:6008',
};

const loadEntries = async function loadEntries(
	base: string
): Promise<StoryEntry[]> {
	const ctx = await request.newContext();
	const res = await ctx.get(`${base}/index.json`);
	const data = (await res.json()) as {
		entries: Record<
			string,
			{ id: string; title: string; name: string; type: string }
		>;
	};
	await ctx.dispose();
	return Object.values(data.entries)
		.filter((e) => e.type === 'story' && frameworkOf(e.title))
		.map((e) => ({ id: e.id, name: e.name, title: e.title }));
};

const OUT = 'parity-diffs';
mkdirSync(OUT, { recursive: true });

const byFramework: Record<string, StoryEntry[]> = {};
await Array.from(Object.entries(URLS)).reduce(
	async (previousIteration, [fw, base]) => {
		await previousIteration;
		byFramework[fw] = await loadEntries(base);
	},
	Promise.resolve()
);
const pairs = pairStories(byFramework).filter(
	(p) => p.entries.react && p.entries.vue
);
console.log(`pairs: ${pairs.map((p) => p.key).join(', ')}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { height: 900, width: 1200 } });

for (const pair of pairs) {
	for (const fw of ['react', 'vue'] as const) {
		const entry = pair.entries[fw];
		if (!entry) {
			continue;
		}
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await page.goto(`${URLS[fw]}/iframe.html?id=${entry.id}&viewMode=story`, {
			waitUntil: 'networkidle',
		});
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await page.waitForTimeout(750);
		const slug = pair.key.replaceAll(/[^a-z0-9]+/giu, '-').toLowerCase();
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await page.locator('#storybook-root').waitFor({ state: 'attached' });
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await markSurfaceRoots(page);
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		const dom = await captureDomSnapshot(page, SURFACE_SCOPE_SELECTOR);
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		const a11y = await captureA11yTree(page, SURFACE_SCOPE_SELECTOR);
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		const styles = await captureComputedStyleMap(page, SURFACE_SCOPE_SELECTOR);
		writeFileSync(`${OUT}/${slug}.${fw}.dom.txt`, dom);
		writeFileSync(`${OUT}/${slug}.${fw}.a11y.txt`, a11y);
		writeFileSync(
			`${OUT}/${slug}.${fw}.styles.json`,
			JSON.stringify(styles, null, 1)
		);
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await page.screenshot({
			fullPage: false,
			path: `${OUT}/${slug}.${fw}.png`,
		});
	}
}
await browser.close();
console.log(`wrote ${OUT}/`);
