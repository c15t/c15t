/**
 * Capture the canonical DOM snapshot + a11y tree of a storybook story.
 * Usage: bun scripts/capture-story.ts <baseUrl> <storyId> <outPrefix>
 */
import { writeFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

import { captureA11yTree } from '../src/diff-a11y';
import { captureComputedStyleMap } from '../src/diff-computed-style';
import { captureDomSnapshot } from '../src/diff-dom';
import { markSurfaceRoots, SURFACE_SCOPE_SELECTOR } from '../src/surface-scope';

const [baseUrl, storyId, outPrefix] = process.argv.slice(2);
if (!baseUrl || !storyId || !outPrefix) {
	throw new Error('usage: capture-story.ts <baseUrl> <storyId> <outPrefix>');
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${baseUrl}/iframe.html?id=${storyId}&viewMode=story`, {
	waitUntil: 'networkidle',
});
await page.locator('#storybook-root').waitFor({ state: 'attached' });
await page.waitForTimeout(500);

await markSurfaceRoots(page);
const dom = await captureDomSnapshot(page, SURFACE_SCOPE_SELECTOR);
const a11y = await captureA11yTree(page, SURFACE_SCOPE_SELECTOR);
const styles = await captureComputedStyleMap(page, SURFACE_SCOPE_SELECTOR);
const rawHtml = await page.evaluate(
	(scope: string) =>
		Array.from(document.querySelectorAll(scope))
			.map((element) => element.outerHTML)
			.join('\n'),
	SURFACE_SCOPE_SELECTOR
);

writeFileSync(`${outPrefix}.dom.txt`, dom);
writeFileSync(`${outPrefix}.a11y.txt`, a11y);
writeFileSync(`${outPrefix}.styles.json`, JSON.stringify(styles, null, 2));
writeFileSync(`${outPrefix}.raw.html`, rawHtml);
await browser.close();
console.log(`captured ${storyId} -> ${outPrefix}.*`);
