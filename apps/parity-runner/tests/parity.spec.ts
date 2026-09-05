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
 *   - `VUE_STORYBOOK_URL` (default http://127.0.0.1:6008)
 *   - `ASTRO_STORYBOOK_URL` (default http://127.0.0.1:6010)
 *   - `PARITY_FRAMEWORKS` (comma list, default `react,svelte`)
 *
 * Known drift these checks are not expected to catch lives in
 * `src/parity-allowlist.ts`. These three report one result per story
 * rather than per element, so their entries use `slot: '*'`.
 */

import { diffComputedStyleMap } from '@c15t/conformance';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { captureA11yTree } from '../src/diff-a11y';
import { captureComputedStyleMap } from '../src/diff-computed-style';
import { captureDomSnapshot } from '../src/diff-dom';
import { selectComparablePairs } from '../src/pair-stories';
import type { ComparablePair } from '../src/pair-stories';
import {
	findAllowEntry,
	unusedAllowlistEntries,
} from '../src/parity-allowlist';
import type { ParityAllowEntry } from '../src/parity-allowlist';
import { loadStorybookIndex } from '../src/storybook-index';
import { markSurfaceRoots, SURFACE_SCOPE_SELECTOR } from '../src/surface-scope';

const FRAMEWORK_URLS: Record<string, string> = {
	astro: process.env.ASTRO_STORYBOOK_URL ?? 'http://127.0.0.1:6010',
	react: process.env.REACT_STORYBOOK_URL ?? 'http://127.0.0.1:6006',
	solid: process.env.SOLID_STORYBOOK_URL ?? 'http://127.0.0.1:6009',
	svelte: process.env.SVELTE_STORYBOOK_URL ?? 'http://127.0.0.1:6007',
	vue: process.env.VUE_STORYBOOK_URL ?? 'http://127.0.0.1:6008',
};

const ENABLED_FRAMEWORKS = (process.env.PARITY_FRAMEWORKS ?? 'react,svelte')
	.split(',')
	.map((f) => f.trim())
	.filter(Boolean);

/**
 * Load and pair stories once per worker. Playwright runs each spec file
 * in its own context, so this executes once per run unless sharded.
 */
const loadPairedStories = async function loadPairedStories(): Promise<
	ComparablePair[]
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
			// Dropping the framework here would leave the run comparing the
			// ones that did load and reporting a pass, which is the one
			// outcome a gate must never produce for a framework it was told
			// to check.
			throw new Error(
				`[parity] ${framework} Storybook index did not load from ${url}`,
				{ cause: err }
			);
		}
	}
	return selectComparablePairs(byFramework, {
		// DevTools owns a dedicated portal-aware comparison in devtools.spec.ts,
		// including same-run pixel checks that also execute on Linux CI.
		excludeKeyPrefixes: ['Core/DevTools/'],
		frameworks: ENABLED_FRAMEWORKS,
	});
};

/**
 * Logs which frameworks each pair is missing.
 *
 * The Storybook apps do not carry the same catalogue, so a partial pair is
 * normal — but an unnoticed one is how drift escapes a comparison. Naming
 * the gaps once per run puts them in the report instead.
 */
const reportPairCoverage = function reportPairCoverage(
	label: string,
	paired: readonly { key: string; missing: string[] }[]
): void {
	const gaps = paired.filter((pair) => pair.missing.length > 0);
	if (gaps.length === 0) {
		return;
	}
	const detail = gaps
		.map((pair) => `${pair.key} (missing ${pair.missing.join(', ')})`)
		.join('; ');
	console.log(`[PARITY] ${label}: ${gaps.length} pair(s) missing a framework`);
	console.log(`[PARITY] ${label}: ${detail}`);
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
	await page.evaluate(() => document.fonts.ready);
	// The overlay and card fade in. Capturing mid-animation reads the
	// in-flight `opacity` as drift, so let the entrance settle first —
	// the same wait the geometry spec uses.
	await page.waitForTimeout(250);
};

/**
 * Scope the descriptive captures to the surfaces the story rendered,
 * wherever they ended up in the document.
 *
 * @param page - The page showing a story.
 * @returns The selector every capture on this page should use.
 */
const scopeToSurfaces = async function scopeToSurfaces(
	page: Page
): Promise<string> {
	await markSurfaceRoots(page);
	return SURFACE_SCOPE_SELECTOR;
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
		const usedEntries = new Set<ParityAllowEntry>();

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
			const baselineScope = await scopeToSurfaces(page);
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const baselineDom = await captureDomSnapshot(page, baselineScope);
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const baselineA11y = await captureA11yTree(page, baselineScope);
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const baselineStyles = await captureComputedStyleMap(page, baselineScope);

			for (const [framework, entry] of rest) {
				const url = FRAMEWORK_URLS[framework];
				if (!url) {
					continue;
				}
				/**
				 * Whether this story's result for one check is a known,
				 * documented difference.
				 *
				 * Call this only once a check has actually failed. Marking
				 * an entry used before that keeps a stale allowance alive
				 * forever, which is the one thing the stale-entry gate
				 * exists to catch.
				 */
				const allowed = function allowed(
					check: 'dom' | 'a11y' | 'css'
				): boolean {
					const allowEntry = findAllowEntry({
						check,
						framework,
						slot: '*',
						story: pair.key,
					});
					if (allowEntry) {
						usedEntries.add(allowEntry);
					}
					return Boolean(allowEntry);
				};
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await openStory(page, url, entry.id);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const scope = await scopeToSurfaces(page);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const dom = await captureDomSnapshot(page, scope);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const a11y = await captureA11yTree(page, scope);
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				const styles = await captureComputedStyleMap(page, scope);

				if (dom !== baselineDom && !allowed('dom')) {
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
				if (a11y !== baselineA11y && !allowed('a11y')) {
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
				if (styleDiffs.length > 0 && !allowed('css')) {
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

		for (const entry of unusedAllowlistEntries(
			usedEntries,
			['dom', 'a11y', 'css'],
			ENABLED_FRAMEWORKS
		)) {
			failures.push(
				`[ALLOWLIST] stale entry matched nothing — delete it: ${entry.check} ${entry.framework} ${entry.story} ${entry.slot}`
			);
		}

		reportPairCoverage('DOM+a11y+CSS', paired);
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
