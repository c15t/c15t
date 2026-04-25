#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
/**
 * Script-loading comparison: v2 vs v3 — page-init to DOM-appended scripts.
 *
 * This is the "how fast can a user start loading tracking scripts from
 * page init?" head-to-head. Both paths do the same work:
 *   1. Create whatever state object the framework requires.
 *   2. Hand it the same N scripts.
 *   3. Simulate a consent decision.
 *   4. Measure time until `<script>` tags are in `document.head`.
 *
 * Fetch is mocked via jsdom-style stubs, so we're measuring framework
 * overhead, not network. Real network costs stack on top identically
 * for both paths.
 *
 * Scenarios:
 *   - 5 scripts  (typical marketing stack: GTM, FB Pixel, Hotjar, Intercom, GA)
 *   - 15 scripts (heavy stack: add LinkedIn, Twitter, TikTok, etc.)
 *   - 50 scripts (adversarial — do blockers scale linearly?)
 */
import { join } from 'node:path';
import {
	configureConsentManager,
	createConsentManagerStore,
	type Script as V2Script,
} from 'c15t';
import { createConsentKernel } from 'c15t/v3';
import {
	createScriptLoader,
	type Script as V3Script,
} from 'c15t/v3/modules/script-loader';
import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

// -- Fixtures ---------------------------------------------------------------

const FIVE: V2Script[] = [
	{
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js',
		category: 'measurement',
	},
	{
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/sdk.js',
		category: 'marketing',
	},
	{
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
		category: 'measurement',
	},
	{
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
		category: 'functionality',
	},
	{
		id: 'analytics',
		src: 'https://www.google-analytics.com/analytics.js',
		category: 'measurement',
	},
];

const FIFTEEN: V2Script[] = [
	...FIVE,
	{
		id: 'linkedin',
		src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		category: 'marketing',
	},
	{
		id: 'twitter',
		src: 'https://static.ads-twitter.com/uwt.js',
		category: 'marketing',
	},
	{
		id: 'tiktok',
		src: 'https://analytics.tiktok.com/i18n/pixel/events.js',
		category: 'marketing',
	},
	{
		id: 'pinterest',
		src: 'https://ct.pinterest.com/ct.js',
		category: 'marketing',
	},
	{
		id: 'reddit',
		src: 'https://www.redditstatic.com/ads/pixel.js',
		category: 'marketing',
	},
	{
		id: 'segment',
		src: 'https://cdn.segment.com/analytics.js',
		category: 'measurement',
	},
	{
		id: 'mixpanel',
		src: 'https://cdn.mxpnl.com/libs/mixpanel.js',
		category: 'measurement',
	},
	{
		id: 'amplitude',
		src: 'https://cdn.amplitude.com/libs/amplitude.js',
		category: 'measurement',
	},
	{
		id: 'sentry',
		src: 'https://browser.sentry-cdn.com/sentry.js',
		category: 'functionality',
	},
	{ id: 'stripe', src: 'https://js.stripe.com/v3/', category: 'functionality' },
];

const FIFTY: V2Script[] = Array.from({ length: 50 }, (_, i) => ({
	id: `script-${i}`,
	src: `https://cdn.example.com/s${i}.js`,
	category: (i % 3 === 0
		? 'marketing'
		: i % 3 === 1
			? 'measurement'
			: 'functionality') as 'marketing' | 'measurement' | 'functionality',
}));

const SCENARIOS: Array<{ name: string; scripts: V2Script[] }> = [
	{ name: '5-scripts', scripts: FIVE },
	{ name: '15-scripts', scripts: FIFTEEN },
	{ name: '50-scripts', scripts: FIFTY },
];

// -- Timing helpers --------------------------------------------------------

function measureSync(iterations: number, fn: () => void): number[] {
	const samples: number[] = [];
	for (let i = 0; i < iterations; i += 1) {
		const start = performance.now();
		fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
}

interface Stats {
	avg: number;
	median: number;
	p95: number;
	min: number;
	max: number;
}

function summarize(samples: number[]): Stats {
	const sorted = [...samples].sort((a, b) => a - b);
	return {
		avg: samples.reduce((a, b) => a + b, 0) / samples.length,
		median: sorted[Math.floor(sorted.length / 2)] ?? 0,
		p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
		min: sorted[0] ?? 0,
		max: sorted[sorted.length - 1] ?? 0,
	};
}

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '50');

// -- DOM cleanup between runs ----------------------------------------------
//
// Both v2 and v3 append scripts to document.head. If we don't clear
// between iterations, the "already loaded" short-circuit skews the
// numbers. Clean heads each run.

function clearHead(): void {
	if (typeof document === 'undefined') return;
	const head = document.head;
	if (head && typeof head.innerHTML === 'string') {
		head.innerHTML = '';
	}
}

// -- v2: createConsentManagerStore with scripts + updateScripts -------------

function runV2(scripts: V2Script[]): number[] {
	const manager = configureConsentManager({ mode: 'offline' });
	return measureSync(ITERATIONS, () => {
		clearHead();
		const store = createConsentManagerStore(manager, {
			initialConsentCategories: [
				'necessary',
				'measurement',
				'marketing',
				'functionality',
			],
			scripts,
		});
		store.getState().updateScripts();
	});
}

// -- v3: createConsentKernel + createScriptLoader ---------------------------

function runV3(scripts: V2Script[]): number[] {
	// Stash each iteration's loader so GC doesn't pressure us inside
	// the measurement window but dispose() isn't part of the timed path
	// either (v2 doesn't do an equivalent teardown).
	const leaks: unknown[] = [];
	const samples = measureSync(ITERATIONS, () => {
		clearHead();
		const kernel = createConsentKernel({
			initialConsents: {
				necessary: true,
				measurement: true,
				marketing: true,
				functionality: true,
				experience: false,
			},
		});
		const loader = createScriptLoader({
			kernel,
			scripts: scripts as V3Script[],
			emitToV2DebugListeners: false,
		});
		leaks.push(loader);
	});
	// Clean up after the run so subsequent scenarios start fresh.
	for (const loader of leaks as Array<{ dispose: () => void }>) {
		loader.dispose();
	}
	return samples;
}

// -- Mount-only variant: measure the reconcile cycle alone once kernel
//    and config are already set up (steady-state cost). ----------------------

function runV2ReconcileOnly(scripts: V2Script[]): number[] {
	const manager = configureConsentManager({ mode: 'offline' });
	const store = createConsentManagerStore(manager, {
		initialConsentCategories: [
			'necessary',
			'measurement',
			'marketing',
			'functionality',
		],
		scripts,
	});
	return measureSync(ITERATIONS, () => {
		clearHead();
		store.getState().updateScripts();
	});
}

function runV3ReconcileOnly(scripts: V2Script[]): number[] {
	const kernel = createConsentKernel({
		initialConsents: {
			necessary: true,
			measurement: true,
			marketing: true,
			functionality: true,
			experience: false,
		},
	});
	const loader = createScriptLoader({
		kernel,
		scripts: scripts as V3Script[],
		emitToV2DebugListeners: false,
	});
	// Flip marketing off/on to force a full unload/load cycle on each
	// iteration. This is the "consent change → scripts reconcile" path.
	return measureSync(ITERATIONS, () => {
		clearHead();
		kernel.set.consent({ marketing: false });
		kernel.set.consent({ marketing: true });
	});
	// (loader is leaked, but we're in a short-lived script — fine for bench.)
	// biome-ignore lint/correctness/noUnusedVariables: see comment above
	loader;
}

// -- Report -----------------------------------------------------------------

interface ScenarioResult {
	name: string;
	scriptCount: number;
	v2: {
		fullInit: Stats;
		reconcileOnly: Stats;
	};
	v3: {
		fullInit: Stats;
		reconcileOnly: Stats;
	};
}

const results: ScenarioResult[] = [];

for (const scenario of SCENARIOS) {
	const v2Full = runV2(scenario.scripts);
	const v3Full = runV3(scenario.scripts);
	const v2Reconcile = runV2ReconcileOnly(scenario.scripts);
	const v3Reconcile = runV3ReconcileOnly(scenario.scripts);

	results.push({
		name: scenario.name,
		scriptCount: scenario.scripts.length,
		v2: {
			fullInit: summarize(v2Full),
			reconcileOnly: summarize(v2Reconcile),
		},
		v3: {
			fullInit: summarize(v3Full),
			reconcileOnly: summarize(v3Reconcile),
		},
	});
}

function pct(v2: number, v3: number): string {
	const d = ((v3 - v2) / v2) * 100;
	const sign = d >= 0 ? '+' : '';
	return `${sign}${d.toFixed(1)}%`;
}

console.log('# Script loading — v2 vs v3 (µs, page-init to DOM-appended)\n');
console.log(`Iterations per metric: ${ITERATIONS}\n`);

for (const r of results) {
	console.log(`## ${r.name} (${r.scriptCount} scripts)\n`);
	console.log(
		'### Full page-init (kernel/store construction → DOM appended)\n'
	);
	console.log('| Metric | v2 p95 | v3 p95 | Δ | v2 median | v3 median | Δ |');
	console.log('|---|---:|---:|---:|---:|---:|---:|');
	console.log(
		`| full init | ${r.v2.fullInit.p95.toFixed(2)} | ${r.v3.fullInit.p95.toFixed(
			2
		)} | **${pct(r.v2.fullInit.p95, r.v3.fullInit.p95)}** | ${r.v2.fullInit.median.toFixed(
			2
		)} | ${r.v3.fullInit.median.toFixed(2)} | **${pct(
			r.v2.fullInit.median,
			r.v3.fullInit.median
		)}** |`
	);
	console.log('');
	console.log('### Reconcile-only (consent change → DOM reconciled)\n');
	console.log('| Metric | v2 p95 | v3 p95 | Δ | v2 median | v3 median | Δ |');
	console.log('|---|---:|---:|---:|---:|---:|---:|');
	console.log(
		`| reconcile | ${r.v2.reconcileOnly.p95.toFixed(2)} | ${r.v3.reconcileOnly.p95.toFixed(
			2
		)} | **${pct(r.v2.reconcileOnly.p95, r.v3.reconcileOnly.p95)}** | ${r.v2.reconcileOnly.median.toFixed(
			2
		)} | ${r.v3.reconcileOnly.median.toFixed(2)} | **${pct(
			r.v2.reconcileOnly.median,
			r.v3.reconcileOnly.median
		)}** |`
	);
	console.log('');
}

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/core-v3-runtime';
mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'script-loading-compare.json'),
	`${JSON.stringify(
		{
			suite: 'script-loading-compare',
			generatedAt: new Date().toISOString(),
			iterations: ITERATIONS,
			scenarios: results,
		},
		null,
		2
	)}\n`
);
