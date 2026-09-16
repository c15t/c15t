/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { safeCommitSha, safeGitDirty } from '@c15t/benchmarking/utils';
import { chromium } from 'playwright';

import {
	normalizeResourceName,
	parseIterations,
} from '../../shared/src/loader-audit';

const variant = process.env.VARIANT ?? 'compound';
const nuxt = variant === 'nuxt';
const warm = process.env.WARM === '1';
const iterations = parseIterations(process.env.BENCH_ITERATIONS, 5);
const commitSha = safeCommitSha();
const metadata = { gitDirty: safeGitDirty() };
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const url =
	process.env.BENCH_URL ??
	(nuxt
		? 'http://localhost:4313/client'
		: `http://localhost:3217/loader-audit?variant=${variant}`);
const selectors: Record<string, string> = {
	'astro-iab': '[data-testid="iab-consent-dialog-root"]',
	compound: '[data-testid="consent-dialog-root"]',
	external: '[data-testid="loader-probe"]',
	nuxt: '[data-testid="consent-dialog-root"]',
	widget: '[data-testid="consent-widget-root"]',
};
const rootSelector = selectors[variant];
if (!rootSelector) {
	throw new Error(`Unknown variant: ${variant}`);
}
const contentSelector =
	variant === 'compound'
		? '[data-testid="consent-dialog-title"]'
		: rootSelector;
const output =
	process.env.BENCH_OUTPUT ??
	`/tmp/c15t-loader-audit-${variant}${warm ? '-warm' : ''}.json`;
interface Sample {
	mounted: number;
	ready: number;
	resources: { name: string; end: number }[];
	mounts?: number[];
}
declare global {
	interface Window {
		__loaderAuditMounts: number[];
	}
}
const browser = await chromium.launch();
const samples: Sample[] = [];
try {
	// Discard the compiler warmup, then measure fresh storage and module contexts.
	for (let iteration = 0; iteration <= iterations; iteration += 1) {
		const context = await browser.newContext();
		if (nuxt) {
			await context.addInitScript(() => {
				// Isolate cold opens and explicit intent warming from idle prefetch.
				window.requestIdleCallback = () => 0;
				window.cancelIdleCallback = () => undefined;
			});
		}
		await context.addInitScript(() =>
			performance.setResourceTimingBufferSize(10000)
		);
		const page = await context.newPage();
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(url);
		if (!nuxt) {
			await page.waitForSelector(
				'#reopen-dialog[data-hydrated="true"][data-active-ui="banner"]'
			);
		}
		await page.waitForSelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await page.evaluate(() => {
			window.__loaderAuditMounts = [];
			window.addEventListener('loader-probe-mounted', () =>
				window.__loaderAuditMounts.push(performance.now())
			);
		});
		if (warm) {
			await page
				.locator('[data-testid="consent-banner-customize-button"]')
				.hover();
			await page.waitForTimeout(200);
		}
		const result = await page.evaluate(
			({ selector, content }) => {
				performance.clearResourceTimings();
				const start = performance.now();
				let mounted: number | undefined;
				let ready: number | undefined;
				return new Promise<Sample>((resolve, reject) => {
					const observe = () => {
						if (mounted === undefined && document.querySelector(selector)) {
							mounted = performance.now() - start;
						}
						const element = document.querySelector(content);
						if (
							ready === undefined &&
							(element?.textContent?.trim() || element?.querySelector('input'))
						) {
							ready = performance.now() - start;
						}
					};
					const observer = new MutationObserver(observe);
					observer.observe(document.body, { childList: true, subtree: true });
					const button = document.querySelector<HTMLButtonElement>(
						'[data-testid="consent-banner-customize-button"]'
					);
					if (!button) {
						throw new Error('Missing Customize button');
					}
					button.click();
					const check = () => {
						observe();
						if (mounted !== undefined && ready !== undefined) {
							observer.disconnect();
							resolve({
								mounted,
								ready,
								resources: (
									performance.getEntriesByType(
										'resource'
									) as PerformanceResourceTiming[]
								)
									.filter((entry) => entry.startTime >= start)
									.map((entry) => ({
										end: entry.responseEnd - start,
										name: entry.name,
									})),
							});
							return;
						}
						if (performance.now() - start > 15000) {
							observer.disconnect();
							reject(new Error('Surface did not mount'));
							return;
						}
						requestAnimationFrame(check);
					};
					requestAnimationFrame(check);
				});
			},
			{ content: contentSelector, selector: rootSelector }
		);
		if (variant === 'external') {
			await page.waitForTimeout(700);
			result.mounts = await page.evaluate(() => {
				const first = window.__loaderAuditMounts[0] ?? 0;
				return window.__loaderAuditMounts.map((time) => time - first);
			});
		}
		if (errors.length > 0) {
			throw new Error(errors.join('\n'));
		}
		if (iteration > 0) {
			samples.push(result);
		}
		await context.close();
	}
	for (const sample of samples) {
		for (const resource of sample.resources) {
			resource.name = normalizeResourceName(resource.name, workspaceRoot);
		}
	}
	mkdirSync(dirname(output), { recursive: true });
	writeFileSync(
		output,
		JSON.stringify(
			{
				browser: browser.version(),
				commitSha,
				metadata,
				samples,
				url,
				variant,
				warm,
			},
			null,
			2
		)
	);
	console.log(`Saved ${samples.length} ${variant} samples to ${output}`);
} finally {
	await browser.close();
}
