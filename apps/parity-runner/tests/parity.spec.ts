/**
 * Cross-framework parity spec.
 *
 * For every Storybook story that exists in *both* frameworks (React and
 * Svelte today; Vue/Solid join when their stories ship), load the
 * iframe in each Storybook and assert:
 *   1. Normalized DOM structure matches across frameworks.
 *   2. Accessibility tree matches across frameworks.
 *   3. Computed CSS + CSS custom properties match across frameworks
 *      for every `[data-testid]` element.
 *   4. Per-framework screenshot matches a committed baseline.
 *
 * Stories are paired by stripping the framework segment from their
 * Storybook title (e.g. `COMPONENTS - REACT/Button` ↔
 * `COMPONENTS - SVELTE/Button`).
 *
 * Environment variables:
 *   - `REACT_STORYBOOK_URL` (default http://127.0.0.1:6006)
 *   - `SVELTE_STORYBOOK_URL` (default http://127.0.0.1:6007)
 *   - `PARITY_FRAMEWORKS` (comma list, default `react,svelte`)
 */

import { diffComputedStyleMap } from '@c15t/conformance';
import { expect, type Page, test } from '@playwright/test';
import { captureA11yTree } from '../src/diff-a11y';
import { captureComputedStyleMap } from '../src/diff-computed-style';
import { captureDomSnapshot } from '../src/diff-dom';
import { type PairedStory, pairStories } from '../src/pair-stories';
import { loadStorybookIndex } from '../src/storybook-index';

const FRAMEWORK_URLS: Record<string, string> = {
	react: process.env.REACT_STORYBOOK_URL ?? 'http://127.0.0.1:6006',
	svelte: process.env.SVELTE_STORYBOOK_URL ?? 'http://127.0.0.1:6007',
	vue: process.env.VUE_STORYBOOK_URL ?? 'http://127.0.0.1:6008',
	solid: process.env.SOLID_STORYBOOK_URL ?? 'http://127.0.0.1:6009',
};

const ENABLED_FRAMEWORKS = (process.env.PARITY_FRAMEWORKS ?? 'react,svelte')
	.split(',')
	.map((f) => f.trim())
	.filter(Boolean);

/**
 * Load and pair stories once per worker. Playwright runs each spec file
 * in its own context, so this executes once per run unless sharded.
 */
async function loadPairedStories(): Promise<PairedStory[]> {
	const byFramework: Record<
		string,
		Awaited<ReturnType<typeof loadStorybookIndex>>
	> = {};
	for (const framework of ENABLED_FRAMEWORKS) {
		const url = FRAMEWORK_URLS[framework];
		if (!url) continue;
		try {
			byFramework[framework] = await loadStorybookIndex(url);
		} catch (err) {
			// If a Storybook isn't running, skip that framework's entries.
			// Downstream pairing will just produce fewer entries.
			console.warn(`[parity] could not load ${framework} index: ${err}`);
		}
	}
	return pairStories(byFramework).filter(
		(pair) => Object.keys(pair.entries).length >= 2
	);
}

async function openStory(
	page: Page,
	baseUrl: string,
	storyId: string
): Promise<void> {
	const url = new URL(`/iframe.html?id=${storyId}&viewMode=story`, baseUrl);
	await page.goto(url.toString(), { waitUntil: 'networkidle' });
	// Storybook renders inside `#storybook-root`. Wait for the element to
	// be attached — stories whose components portal to `document.body`
	// (banner, dialog) leave the root itself empty/hidden, so `visible`
	// would time out on them. Attachment is enough; the body content
	// we actually care about settles with `networkidle`.
	await page.locator('#storybook-root').waitFor({ state: 'attached' });
}

/**
 * Snapshot file key: safe-for-filesystem slug derived from the paired key
 * (which itself is the storybook title with the framework segment stripped).
 */
function snapshotKey(pairKey: string): string {
	return pairKey
		.replace(/[^a-z0-9]+/gi, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

test.describe('cross-framework parity', () => {
	// Load stories lazily so config errors surface as test failures, not
	// worker-init crashes.
	test('paired stories load from every enabled Storybook', async () => {
		const paired = await loadPairedStories();
		expect(paired.length).toBeGreaterThan(0);
	});

	test('paired stories produce identical DOM + a11y + computed-style snapshots', async ({
		page,
	}) => {
		const paired = await loadPairedStories();
		const failures: string[] = [];

		for (const pair of paired) {
			const entries = Object.entries(pair.entries);
			if (entries.length < 2) continue;
			const [[baselineFramework, baselineEntry], ...rest] = entries;
			if (!baselineFramework || !baselineEntry) continue;

			const baselineUrl = FRAMEWORK_URLS[baselineFramework];
			if (!baselineUrl) continue;
			await openStory(page, baselineUrl, baselineEntry.id);
			const baselineDom = await captureDomSnapshot(page, '#storybook-root');
			const baselineA11y = await captureA11yTree(page);
			const baselineStyles = await captureComputedStyleMap(
				page,
				'#storybook-root'
			);

			for (const [framework, entry] of rest) {
				const url = FRAMEWORK_URLS[framework];
				if (!url) continue;
				await openStory(page, url, entry.id);
				const dom = await captureDomSnapshot(page, '#storybook-root');
				const a11y = await captureA11yTree(page);
				const styles = await captureComputedStyleMap(page, '#storybook-root');

				if (dom !== baselineDom) {
					failures.push(
						`[DOM] ${pair.key}: ${baselineFramework} ≠ ${framework}`
					);
				}
				if (a11y !== baselineA11y) {
					failures.push(
						`[A11Y] ${pair.key}: ${baselineFramework} ≠ ${framework}`
					);
				}

				const styleDiffs = diffComputedStyleMap(baselineStyles, styles);
				if (styleDiffs.length > 0) {
					// Summarize to keep the failure output legible; the first few
					// diffs usually point at the offending class contract.
					const sample = styleDiffs
						.slice(0, 5)
						.map(
							(d) =>
								`${d.path}.${d.name}: ${d.a ?? '<missing>'} ≠ ${d.b ?? '<missing>'}`
						)
						.join('; ');
					failures.push(
						`[CSS] ${pair.key}: ${baselineFramework} ≠ ${framework} (${styleDiffs.length} diff${styleDiffs.length === 1 ? '' : 's'}) — ${sample}`
					);
				}
			}
		}

		expect(failures, failures.join('\n')).toHaveLength(0);
	});

	/**
	 * Per-framework visual regression. Each story gets a committed baseline
	 * screenshot per framework; a diff fails the test. Cross-framework pixel
	 * comparisons are intentionally out of scope — font/subpixel rendering
	 * makes that too noisy. Computed-style parity (above) covers cross-
	 * framework CSS drift; screenshots lock visual regressions within a
	 * single framework.
	 */
	test('paired stories match committed screenshot baselines per framework', async ({
		page,
	}) => {
		const paired = await loadPairedStories();
		for (const pair of paired) {
			for (const [framework, entry] of Object.entries(pair.entries)) {
				const url = FRAMEWORK_URLS[framework];
				if (!url) continue;
				await openStory(page, url, entry.id);
				// Allow web fonts + CSS transitions to settle before snapshotting.
				await page.evaluate(() => document.fonts.ready);
				await page.waitForTimeout(100);
				// Full-page screenshot: banner/dialog portals render to
				// `document.body`, so `#storybook-root` alone misses them.
				await expect(page).toHaveScreenshot(
					`${snapshotKey(pair.key)}-${framework}.png`,
					{
						animations: 'disabled',
						fullPage: true,
					}
				);
			}
		}
	});
});
