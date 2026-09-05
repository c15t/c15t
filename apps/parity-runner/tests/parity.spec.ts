/**
 * Cross-framework parity spec.
 *
 * For required React, Svelte and Vue core stories, verify every configured
 * framework is present, then load the
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
 *   - `VUE_STORYBOOK_URL` (default http://127.0.0.1:6008)
 *   - `PARITY_FRAMEWORKS` (comma list, default `react,svelte,vue`)
 * Solid is primitives-only and excluded from this core adapter contract.
 */

import { diffComputedStyleMap } from '@c15t/conformance';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { captureDialogEvidence } from '../src/dialog-evidence';
import { captureA11yTree } from '../src/diff-a11y';
import { captureComputedStyleMap } from '../src/diff-computed-style';
import { captureDomSnapshot } from '../src/diff-dom';
import { pairStories } from '../src/pair-stories';
import type { PairedStory } from '../src/pair-stories';
import { loadStorybookIndex } from '../src/storybook-index';

const FRAMEWORK_URLS: Record<string, string> = {
	react: process.env.REACT_STORYBOOK_URL ?? 'http://127.0.0.1:6006',
	solid: process.env.SOLID_STORYBOOK_URL ?? 'http://127.0.0.1:6009',
	svelte: process.env.SVELTE_STORYBOOK_URL ?? 'http://127.0.0.1:6007',
	vue: process.env.VUE_STORYBOOK_URL ?? 'http://127.0.0.1:6008',
};

const ENABLED_FRAMEWORKS = (process.env.PARITY_FRAMEWORKS ?? 'react,svelte,vue')
	.split(',')
	.map((f) => f.trim())
	.filter(Boolean);

const REQUIRED_CORE_STORIES = [
	'Core/Consent Banner/Default',
	'Core/Consent Banner/Banner Contract',
	'Core/Consent Banner/Banner Accept Via Keyboard',
	'Core/Consent Banner/Banner Focus Management',
	'Core/Consent Banner/Banner To Dialog Flow',
	'Core/Consent Dialog/Default',
	'Core/Consent Dialog/Dialog Contract',
	'Core/Consent Dialog/Dialog Escape Closes',
	'Core/Consent Dialog/Save Flow',
	'Core/Consent Dialog Trigger/Default',
	'Core/Consent Dialog Trigger/Dialog Focus Management',
	'Core/Consent Widget/Default',
	'Core/Consent Widget/Expanded Categories',
	'Core/Consent Dialog Link/Default',
	'Core/Frame/Placeholder',
	'Core/Frame/Granted Content',
] as const;

/**
 * Load and pair stories once per worker. Playwright runs each spec file
 * in its own context, so this executes once per run unless sharded.
 */
const loadPairedStories = async function loadPairedStories(): Promise<
	PairedStory[]
> {
	const byFramework: Record<
		string,
		Awaited<ReturnType<typeof loadStorybookIndex>>
	> = {};
	for (const framework of ENABLED_FRAMEWORKS.filter(
		(entry) => entry !== 'solid'
	)) {
		const url = FRAMEWORK_URLS[framework];
		if (!url) {
			throw new Error(`Unknown configured parity framework: ${framework}`);
		}
		// oxlint-disable-next-line no-await-in-loop -- Load each required local Storybook.
		byFramework[framework] = await loadStorybookIndex(url);
	}
	const paired = pairStories(byFramework);
	for (const key of REQUIRED_CORE_STORIES) {
		expect(
			Object.keys(paired.find((pair) => pair.key === key)?.entries ?? {}),
			key
		).toEqual(ENABLED_FRAMEWORKS.filter((entry) => entry !== 'solid'));
	}
	console.log(
		'[PARITY coverage]',
		JSON.stringify(
			Object.fromEntries(
				Object.entries(byFramework).map(([framework, stories]) => [
					framework,
					{
						indexedStories: stories.length,
						requiredCoreStories: REQUIRED_CORE_STORIES.length,
					},
				])
			)
		)
	);
	return paired.filter((pair) => Object.keys(pair.entries).length >= 2);
};

const openStory = async function openStory(
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
	await page.waitForFunction((id) => {
		const preview = (
			window as typeof window & {
				__STORYBOOK_PREVIEW__?: {
					storyRenders: { id: string; phase: string }[];
				};
			}
		).__STORYBOOK_PREVIEW__;
		return preview?.storyRenders.some(
			(render) => render.id === id && render.phase === 'finished'
		);
	}, storyId);
	await expect(
		page.locator('body'),
		`${storyId}: story render or play failed`
	).not.toHaveClass(/sb-show-errordisplay/u);
};

/**
 * Snapshot file key: safe-for-filesystem slug derived from the paired key
 * (which itself is the storybook title with the framework segment stripped).
 */
const snapshotKey = function snapshotKey(pairKey: string): string {
	return pairKey
		.replace(/[^a-z0-9]+/giu, '-')
		.replace(/^-+|-+$/gu, '')
		.toLowerCase();
};

const findFirstDiff = function findFirstDiff(
	a: string,
	b: string
): { offset: number; a: string; b: string } {
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i += 1) {
		if (a[i] !== b[i]) {
			const start = Math.max(0, i - 40);
			const end = i + 120;
			return { a: a.slice(start, end), b: b.slice(start, end), offset: i };
		}
	}
	return {
		a: a.slice(Math.max(0, len - 40), len + 120),
		b: b.slice(Math.max(0, len - 40), len + 120),
		offset: len,
	};
};

test.describe('cross-framework parity', () => {
	test('captures portal content and detects changes after relocation', async ({
		page,
	}) => {
		await page.setContent(
			'<div id="storybook-root"><section data-testid="consent-dialog-root"><button data-testid="consent-widget-footer-save-button">Save</button></section></div>'
		);
		const inline = await captureDomSnapshot(page, 'body');
		await page.evaluate(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			if (dialog) {
				document.body.append(dialog);
			}
		});
		expect(await captureDomSnapshot(page, 'body')).toBe(inline);
		const styles = await captureComputedStyleMap(page, 'body');
		expect(styles['consent-dialog-root']).toBeDefined();
		expect(styles['consent-widget-footer-save-button']).toBeDefined();
		await page.locator('button').evaluate((button) => button.remove());
		expect(await captureDomSnapshot(page, 'body')).not.toBe(inline);
	});
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
			if (entries.length < 2) {
				continue;
			}
			const [[baselineFramework, baselineEntry], ...rest] = entries;
			if (!baselineFramework || !baselineEntry) {
				continue;
			}

			const baselineUrl = FRAMEWORK_URLS[baselineFramework];
			if (!baselineUrl) {
				continue;
			}
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			await openStory(page, baselineUrl, baselineEntry.id);
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const baselineDom = await captureDomSnapshot(page, 'body');
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const baselineA11y = await captureA11yTree(page);
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const baselineStyles = await captureComputedStyleMap(page, 'body');
			// oxlint-disable-next-line no-await-in-loop -- Capture the current story before navigation.
			const baselineDialog = await captureDialogEvidence(page);

			const captures: Record<string, unknown> = {
				[baselineFramework]: {
					a11y: baselineA11y,
					dialog: baselineDialog,
					dom: baselineDom,
					styles: baselineStyles,
				},
			};

			for (const [framework, entry] of rest) {
				const url = FRAMEWORK_URLS[framework];
				if (!url) {
					continue;
				}
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await openStory(page, url, entry.id);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const dom = await captureDomSnapshot(page, 'body');
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const a11y = await captureA11yTree(page);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const styles = await captureComputedStyleMap(page, 'body');
				// oxlint-disable-next-line no-await-in-loop -- Capture the current story before navigation.
				const dialog = await captureDialogEvidence(page);
				captures[framework] = { a11y, dialog, dom, styles };
				if (JSON.stringify(dialog) !== JSON.stringify(baselineDialog)) {
					failures.push(
						`[DIALOG] ${pair.key}: ${baselineFramework} ≠ ${framework} (${JSON.stringify(baselineDialog)} ≠ ${JSON.stringify(dialog)})`
					);
				}

				if (dom !== baselineDom) {
					failures.push(
						`[DOM] ${pair.key}: ${baselineFramework} ≠ ${framework}`
					);
					if (process.env.PARITY_DEBUG) {
						const firstDiff = findFirstDiff(baselineDom, dom);
						console.log(
							`\n[PARITY_DEBUG DOM] ${pair.key}\n  baseline (${baselineFramework}) len=${baselineDom.length}\n  other    (${framework}) len=${dom.length}\n  first diff @${firstDiff.offset}:\n, baseline: …${firstDiff.a}\n, other:    …${firstDiff.b}`
						);
					}
				}
				if (a11y !== baselineA11y) {
					failures.push(
						`[A11Y] ${pair.key}: ${baselineFramework} ≠ ${framework}`
					);
					if (process.env.PARITY_DEBUG) {
						const firstDiff = findFirstDiff(baselineA11y, a11y);
						console.log(
							`\n[PARITY_DEBUG A11Y] ${pair.key}\n  first diff @${firstDiff.offset}:\n, baseline: …${firstDiff.a}\n, other:    …${firstDiff.b}`
						);
					}
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
			// oxlint-disable-next-line no-await-in-loop -- Attach evidence for this completed story comparison.
			await test.info().attach(snapshotKey(pair.key), {
				body: JSON.stringify(captures, null, 2),
				contentType: 'application/json',
			});
		}

		console.log(`[PARITY] DOM+a11y+CSS: ${failures.length} failure(s)`);
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
				if (!url) {
					continue;
				}
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await openStory(page, url, entry.id);
				// Allow web fonts + CSS transitions to settle before snapshotting.
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await page.evaluate(() => document.fonts.ready);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await page.waitForTimeout(100);
				// Full-page screenshot: banner/dialog portals render to
				// `document.body`, so `#storybook-root` alone misses them.
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await expect
					.soft(page)
					.toHaveScreenshot(`${snapshotKey(pair.key)}-${framework}.png`, {
						animations: 'disabled',
						fullPage: true,
					});
			}
		}
	});
});
