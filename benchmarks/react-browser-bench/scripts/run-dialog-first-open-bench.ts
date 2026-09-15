/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { chromium } from 'playwright';
import type { Page } from 'playwright';

const url = process.env.BENCH_URL ?? 'http://localhost:3217/dialog-first-open';
const iterations = Number(process.env.BENCH_ITERATIONS ?? '10');
const output = process.env.BENCH_OUTPUT ?? '/tmp/c15t-dialog-results.json';

const measure = (page: Page, selector: string) =>
	page.evaluate((buttonSelector) => {
		const button = document.querySelector(buttonSelector);
		if (!(button instanceof HTMLElement)) {
			throw new Error(`Missing button: ${buttonSelector}`);
		}
		const started = performance.now();
		let mounted: number | undefined;
		let visible: number | undefined;
		const findDialog = () =>
			document.querySelector('[data-testid="consent-dialog-root"]');
		const observer = new MutationObserver(() => {
			if (mounted === undefined && findDialog()) {
				mounted = performance.now() - started;
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		// Invoke the real banner handler without pointerenter or focus preloading.
		button.click();
		return new Promise<{
			mounted: number;
			visible: number;
			fullyVisible: number;
			resources: { name: string; end: number; type: string }[];
		}>((resolve, reject) => {
			const check = () => {
				const elapsed = performance.now() - started;
				const dialog = findDialog();
				let opacity = 1;
				let element = dialog;
				while (element) {
					const style = getComputedStyle(element);
					opacity *= Number(style.opacity);
					if (style.visibility === 'hidden' || style.display === 'none') {
						opacity = 0;
					}
					element = element.parentElement;
				}
				if (
					dialog &&
					dialog.getBoundingClientRect().height > 0 &&
					opacity > 0
				) {
					visible ??= elapsed;
					if (opacity >= 0.999 && mounted !== undefined) {
						observer.disconnect();
						resolve({
							fullyVisible: elapsed,
							mounted,
							resources: (
								performance.getEntriesByType(
									'resource'
								) as PerformanceResourceTiming[]
							)
								.filter((entry) => entry.startTime >= started)
								.map((entry) => ({
									end: entry.responseEnd - started,
									name: entry.name,
									type: entry.initiatorType,
								})),
							visible,
						});
						return;
					}
				}
				if (elapsed > 10000) {
					observer.disconnect();
					reject(new Error('Dialog did not become visible'));
					return;
				}
				requestAnimationFrame(check);
			};
			requestAnimationFrame(check);
		});
	}, selector);

const browser = await chromium.launch();
try {
	const samples: {
		first: Awaited<ReturnType<typeof measure>>;
		reopen: Awaited<ReturnType<typeof measure>>;
	}[] = [];
	// Warm Next's compiler, but use a fresh browser context for every measured run.
	const warmup = await browser.newPage();
	await warmup.goto(url);
	await warmup.waitForSelector(
		'[data-testid="consent-banner-customize-button"]'
	);
	await measure(warmup, '[data-testid="consent-banner-customize-button"]');
	await warmup.close();
	for (let iteration = 0; iteration < iterations; iteration += 1) {
		const context = await browser.newContext();
		const page = await context.newPage();
		await page.goto(url);
		await page.waitForSelector(
			'#reopen-dialog[data-hydrated="true"][data-active-ui="banner"]'
		);
		await page.waitForSelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		const first = await measure(
			page,
			'[data-testid="consent-banner-customize-button"]'
		);
		await page.keyboard.press('Escape');
		await page.waitForSelector('[data-testid="consent-dialog-root"]', {
			state: 'detached',
		});
		const reopen = await measure(page, '#reopen-dialog');
		samples.push({ first, reopen });
		await context.close();
	}
	const median = (values: number[]) => {
		const sorted = values.toSorted((left, right) => left - right);
		const middle = Math.floor(sorted.length / 2);
		const upper = sorted[middle] ?? 0;
		const lower = sorted[middle - 1] ?? upper;
		return sorted.length % 2 === 0 ? (lower + upper) / 2 : upper;
	};
	const summary = Object.fromEntries(
		(['first', 'reopen'] as const).map((kind) => [
			kind,
			Object.fromEntries(
				(['mounted', 'visible', 'fullyVisible'] as const).map((metric) => [
					metric,
					median(samples.map((sample) => sample[kind][metric])),
				])
			),
		])
	);
	mkdirSync(dirname(output), { recursive: true });
	writeFileSync(
		output,
		JSON.stringify(
			{ browser: browser.version(), iterations, samples, summary, url },
			null,
			2
		)
	);
	console.log(JSON.stringify({ output, summary }, null, 2));
} finally {
	await browser.close();
}
