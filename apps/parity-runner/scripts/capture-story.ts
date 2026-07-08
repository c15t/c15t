/**
 * Capture the canonical DOM snapshot + a11y tree of a storybook story.
 * Usage: bun scripts/capture-story.ts <baseUrl> <storyId> <outPrefix>
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { captureA11yTree } from '../src/diff-a11y';
import { captureComputedStyleMap } from '../src/diff-computed-style';
import { captureDomSnapshot } from '../src/diff-dom';

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

const dom = await captureDomSnapshot(page, '#storybook-root');
const a11y = await captureA11yTree(page);
const styles = await captureComputedStyleMap(page, '#storybook-root');
const rawHtml = await page.evaluate(
	() => document.querySelector('#storybook-root')?.outerHTML ?? ''
);

writeFileSync(`${outPrefix}.dom.txt`, dom);
writeFileSync(`${outPrefix}.a11y.txt`, a11y);
writeFileSync(`${outPrefix}.styles.json`, JSON.stringify(styles, null, 2));
writeFileSync(`${outPrefix}.raw.html`, rawHtml);
await browser.close();
console.log(`captured ${storyId} -> ${outPrefix}.*`);
