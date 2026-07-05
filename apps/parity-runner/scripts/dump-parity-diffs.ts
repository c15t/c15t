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
import { frameworkOf, pairStories, type StoryEntry } from '../src/pair-stories';

const URLS: Record<string, string> = {
	react: 'http://127.0.0.1:6006',
	vue: 'http://127.0.0.1:6008',
};

async function loadEntries(base: string): Promise<StoryEntry[]> {
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
		.map((e) => ({ id: e.id, title: e.title, name: e.name }));
}

const OUT = 'parity-diffs';
mkdirSync(OUT, { recursive: true });

const byFramework: Record<string, StoryEntry[]> = {};
for (const [fw, base] of Object.entries(URLS)) {
	byFramework[fw] = await loadEntries(base);
}
const pairs = pairStories(byFramework).filter(
	(p) => p.entries.react && p.entries.vue
);
console.log(`pairs: ${pairs.map((p) => p.key).join(', ')}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

for (const pair of pairs) {
	for (const fw of ['react', 'vue'] as const) {
		const entry = pair.entries[fw];
		if (!entry) continue;
		await page.goto(`${URLS[fw]}/iframe.html?id=${entry.id}&viewMode=story`, {
			waitUntil: 'networkidle',
		});
		await page.waitForTimeout(750);
		const slug = pair.key.replaceAll(/[^a-z0-9]+/gi, '-').toLowerCase();
		await page.locator('#storybook-root').waitFor({ state: 'attached' });
		const dom = await captureDomSnapshot(page, '#storybook-root');
		const a11y = await captureA11yTree(page);
		const styles = await captureComputedStyleMap(page, '#storybook-root');
		writeFileSync(`${OUT}/${slug}.${fw}.dom.txt`, dom);
		writeFileSync(`${OUT}/${slug}.${fw}.a11y.txt`, a11y);
		writeFileSync(
			`${OUT}/${slug}.${fw}.styles.json`,
			JSON.stringify(styles, null, 1)
		);
		await page.screenshot({
			path: `${OUT}/${slug}.${fw}.png`,
			fullPage: false,
		});
	}
}
await browser.close();
console.log(`wrote ${OUT}/`);
