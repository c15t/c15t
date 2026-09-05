/**
 * Cross-framework visual parity.
 *
 * Two checks, both against React as the baseline, both driven by the same
 * story pairing the DOM/a11y/CSS spec uses:
 *
 *   1. **Geometry** — every `data-testid` slot's box, relative to the card
 *      it sits in, must match React within 1px. Deterministic, no images,
 *      and it fails on exactly the class of drift the descriptive diffs
 *      cannot see: same markup, different layout.
 *   2. **Pixel backstop** — element screenshots of the banner card and the
 *      dialog card, compared to React with a per-channel tolerance and a
 *      small mismatch budget. Loose on antialiasing, strict on size.
 *
 * Known drift that is out of scope goes in `src/parity-allowlist.ts` with
 * a reason, keyed by check + framework + story + slot.
 *
 * Environment variables:
 *   - `{REACT,SVELTE,VUE,ASTRO}_STORYBOOK_URL`
 *   - `PARITY_FRAMEWORKS` (comma list, default `react,svelte`)
 *   - `PARITY_SKIP_PIXEL=1` skips the pixel backstop. Font rasterisation is
 *     machine-specific, so the budget is calibrated for CI's pinned
 *     Chromium and a local run will produce noise.
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
	captureGeometry,
	diffGeometry,
	formatGeometryDiffs,
} from '../src/geometry';
import { pairStories } from '../src/pair-stories';
import type { PairedStory } from '../src/pair-stories';
import {
	findAllowEntry,
	unusedAllowlistEntries,
} from '../src/parity-allowlist';
import type { ParityAllowEntry } from '../src/parity-allowlist';
import { comparePng } from '../src/pixel-diff';
import { loadStorybookIndex } from '../src/storybook-index';

const FRAMEWORK_URLS: Record<string, string> = {
	astro: process.env.ASTRO_STORYBOOK_URL ?? 'http://127.0.0.1:6010',
	react: process.env.REACT_STORYBOOK_URL ?? 'http://127.0.0.1:6006',
	solid: process.env.SOLID_STORYBOOK_URL ?? 'http://127.0.0.1:6009',
	svelte: process.env.SVELTE_STORYBOOK_URL ?? 'http://127.0.0.1:6007',
	vue: process.env.VUE_STORYBOOK_URL ?? 'http://127.0.0.1:6008',
};

const ENABLED_FRAMEWORKS = (process.env.PARITY_FRAMEWORKS ?? 'react,svelte')
	.split(',')
	.map((framework) => framework.trim())
	.filter(Boolean);

/** React is the baseline every other framework is measured against. */
const BASELINE = 'react';

/** Largest box difference, in px, that is not drift. */
const GEOMETRY_TOLERANCE = 1;

/** The cards the pixel backstop photographs. */
const PIXEL_SLOTS = ['consent-banner-card', 'consent-dialog-card'];

const PIXEL_BUDGET = { maxRatio: 0.005, threshold: 12 };

const loadPairedStories = async function loadPairedStories(): Promise<
	PairedStory[]
> {
	const byFramework: Record<
		string,
		Awaited<ReturnType<typeof loadStorybookIndex>>
	> = {};
	for (const framework of ENABLED_FRAMEWORKS) {
		const url = FRAMEWORK_URLS[framework];
		if (!url) {
			continue;
		}
		try {
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			byFramework[framework] = await loadStorybookIndex(url);
		} catch (err) {
			console.warn(`[parity] could not load ${framework} index: ${err}`);
		}
	}
	// Only stories React also has: React is the baseline, so a pair without
	// it has nothing to be measured against.
	return pairStories(byFramework).filter(
		(pair) => pair.entries[BASELINE] && Object.keys(pair.entries).length >= 2
	);
};

const openStory = async function openStory(
	page: Page,
	baseUrl: string,
	storyId: string
): Promise<void> {
	const url = new URL(`/iframe.html?id=${storyId}&viewMode=story`, baseUrl);
	await page.goto(url.toString(), { waitUntil: 'networkidle' });
	await page.locator('#storybook-root').waitFor({ state: 'attached' });
	await page.evaluate(() => document.fonts.ready);
	// Enter/leave transitions on the banner and dialog settle well inside
	// this; `animations: 'disabled'` only applies to screenshots.
	await page.waitForTimeout(250);
};

test.describe('cross-framework visual parity', () => {
	test.use({
		colorScheme: 'light',
		deviceScaleFactor: 1,
		reducedMotion: 'reduce',
		viewport: { height: 800, width: 1280 },
	});

	test('paired stories lay out identically to React', async ({ page }) => {
		const paired = await loadPairedStories();
		expect(paired.length, 'no paired stories to compare').toBeGreaterThan(0);

		const failures: string[] = [];
		const usedEntries = new Set<ParityAllowEntry>();

		for (const pair of paired) {
			const baselineEntry = pair.entries[BASELINE];
			const baselineUrl = FRAMEWORK_URLS[BASELINE];
			if (!(baselineEntry && baselineUrl)) {
				continue;
			}
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			await openStory(page, baselineUrl, baselineEntry.id);
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const baseline = await captureGeometry(page);

			for (const [framework, entry] of Object.entries(pair.entries)) {
				const url = FRAMEWORK_URLS[framework];
				if (framework === BASELINE || !url) {
					continue;
				}
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await openStory(page, url, entry.id);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const candidate = await captureGeometry(page);

				const diffs = diffGeometry(
					baseline,
					candidate,
					GEOMETRY_TOLERANCE
				).filter((diff) => {
					const allowed = findAllowEntry({
						check: 'geometry',
						framework,
						slot: diff.slot,
						story: pair.key,
					});
					if (allowed) {
						usedEntries.add(allowed);
					}
					return !allowed;
				});

				if (diffs.length > 0) {
					failures.push(
						`[GEOMETRY] ${pair.key}: ${BASELINE} ≠ ${framework}\n    ${formatGeometryDiffs(
							diffs
						).join('\n    ')}`
					);
				}
			}
		}

		for (const entry of unusedAllowlistEntries(usedEntries)) {
			failures.push(
				`[ALLOWLIST] stale entry matched nothing — delete it: ${entry.check} ${entry.framework} ${entry.story} ${entry.slot}`
			);
		}

		console.log(`[PARITY] geometry: ${failures.length} failure(s)`);
		expect(failures, failures.join('\n')).toHaveLength(0);
	});

	test('paired story cards match React pixel-for-pixel', async ({
		page,
	}, testInfo) => {
		test.skip(
			process.env.PARITY_SKIP_PIXEL === '1',
			'PARITY_SKIP_PIXEL=1: the budget is calibrated for CI’s pinned Chromium.'
		);

		const paired = await loadPairedStories();
		const failures: string[] = [];

		for (const pair of paired) {
			const baselineEntry = pair.entries[BASELINE];
			const baselineUrl = FRAMEWORK_URLS[BASELINE];
			if (!(baselineEntry && baselineUrl)) {
				continue;
			}
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			await openStory(page, baselineUrl, baselineEntry.id);

			const baselineShots = new Map<string, Buffer>();
			for (const slot of PIXEL_SLOTS) {
				const locator = page.locator(`[data-testid="${slot}"]`).first();
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				if ((await locator.count()) === 0) {
					continue;
				}
				baselineShots.set(
					slot,
					// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
					await locator.screenshot({ animations: 'disabled' })
				);
			}
			if (baselineShots.size === 0) {
				continue;
			}

			for (const [framework, entry] of Object.entries(pair.entries)) {
				const url = FRAMEWORK_URLS[framework];
				if (framework === BASELINE || !url) {
					continue;
				}
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await openStory(page, url, entry.id);

				for (const [slot, baselineShot] of baselineShots) {
					if (
						findAllowEntry({ check: 'pixel', framework, slot, story: pair.key })
					) {
						continue;
					}
					const locator = page.locator(`[data-testid="${slot}"]`).first();
					// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
					if ((await locator.count()) === 0) {
						failures.push(
							`[PIXEL] ${pair.key} ${slot}: ${framework} does not render this slot`
						);
						continue;
					}
					// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
					const shot = await locator.screenshot({ animations: 'disabled' });
					const result = comparePng(baselineShot, shot, PIXEL_BUDGET);
					if (result.ok) {
						continue;
					}
					failures.push(
						`[PIXEL] ${pair.key} ${slot}: ${BASELINE} ≠ ${framework} — ${result.reason}`
					);
					const name = `${pair.key}-${slot}-${framework}`.replace(
						/[^a-z0-9]+/giu,
						'-'
					);
					// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
					await testInfo.attach(`${name}-react.png`, {
						body: baselineShot,
						contentType: 'image/png',
					});
					// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
					await testInfo.attach(`${name}-${framework}.png`, {
						body: shot,
						contentType: 'image/png',
					});
					if (result.diff) {
						// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
						await testInfo.attach(`${name}-diff.png`, {
							body: result.diff,
							contentType: 'image/png',
						});
					}
				}
			}
		}

		console.log(`[PARITY] pixel: ${failures.length} failure(s)`);
		expect(failures, failures.join('\n')).toHaveLength(0);
	});
});
