#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
/**
 * Iframe blocker comparison: v2 vs v3.
 *
 * Measures the cost of processing N iframes on the page at install time
 * (the realistic "page first paint with blocked iframes" scenario) and
 * the cost of reprocessing when consent changes.
 *
 * Scenarios:
 *   - 10 iframes, install + consent grant
 *   - 50 iframes, install + consent grant
 *   - 100 iframes, install + consent grant
 */
import { join } from 'node:path';
import { configureConsentManager, createConsentManagerStore } from 'c15t';
import { createConsentKernel } from 'c15t/v3';
import { createIframeBlocker } from 'c15t/v3/modules/iframe-blocker';
import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

// ---- Proper iframe + body mock so both blockers have real work to do.

interface MockIframe {
	tagName: 'IFRAME';
	nodeType: 1;
	attrs: Map<string, string>;
	getAttribute(k: string): string | null;
	setAttribute(k: string, v: string): void;
	removeAttribute(k: string): void;
	querySelectorAll(): MockIframe[];
	get src(): string | null;
	set src(v: string | null);
}

interface MockBody {
	children: MockIframe[];
	appendChild(child: MockIframe): void;
}

function createMockIframe(category: string, dataSrc?: string): MockIframe {
	const attrs = new Map<string, string>();
	attrs.set('data-category', category);
	if (dataSrc) attrs.set('data-src', dataSrc);
	return {
		tagName: 'IFRAME',
		nodeType: 1,
		attrs,
		getAttribute(k) {
			return attrs.get(k) ?? null;
		},
		setAttribute(k, v) {
			attrs.set(k, v);
		},
		removeAttribute(k) {
			attrs.delete(k);
		},
		querySelectorAll() {
			return [];
		},
		get src() {
			return attrs.get('src') ?? null;
		},
		set src(v) {
			if (v === null || v === undefined) attrs.delete('src');
			else attrs.set('src', v);
		},
	};
}

function setupDom(iframeCount: number): MockBody {
	const body: MockBody = {
		children: [],
		appendChild(child) {
			body.children.push(child);
		},
	};
	for (let i = 0; i < iframeCount; i++) {
		const category = i % 2 === 0 ? 'marketing' : 'measurement';
		body.children.push(createMockIframe(category, `https://example.com/i${i}`));
	}
	const doc = {
		body,
		querySelectorAll: () => body.children,
		createElement: () => createMockIframe('marketing'),
		head: body,
	};
	// biome-ignore lint/suspicious/noExplicitAny: test env stub
	(globalThis as any).document = doc;
	return body;
}

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
}
function summarize(samples: number[]): Stats {
	const sorted = [...samples].sort((a, b) => a - b);
	return {
		avg: samples.reduce((a, b) => a + b, 0) / samples.length,
		median: sorted[Math.floor(sorted.length / 2)] ?? 0,
		p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
	};
}

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '30');
const SCENARIOS = [10, 50, 100];

function pct(a: number, b: number): string {
	const d = ((b - a) / a) * 100;
	return (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
}

function resetBodyConsent(body: MockBody): void {
	for (const child of body.children) {
		child.attrs.delete('src');
		child.attrs.set(
			'data-src',
			child.attrs.get('data-src') ?? 'https://example.com/'
		);
	}
}

function runV2(iframeCount: number): Stats {
	const body = setupDom(iframeCount);
	const manager = configureConsentManager({ mode: 'offline' });
	const store = createConsentManagerStore(manager, {
		initialConsentCategories: ['necessary'],
	});

	// Install is done at createConsentManagerStore time via initializeIframeBlocker.
	const samples = measureSync(ITERATIONS, () => {
		resetBodyConsent(body);
		// Simulate a consent change → processIframes runs on all iframes.
		store
			.getState()
			.updateIframeConsents({ marketing: true, measurement: true });
	});
	return summarize(samples);
}

function runV3(iframeCount: number): Stats {
	const body = setupDom(iframeCount);
	// Start from "consent denied" baseline, reset to denied each iteration.
	const kernel = createConsentKernel();
	createIframeBlocker({ kernel });

	let toggle = false;
	const samples = measureSync(ITERATIONS, () => {
		resetBodyConsent(body);
		toggle = !toggle;
		// Flip between grant and revoke — one consent change per iteration
		// (matches v2's single updateIframeConsents call).
		kernel.set.consent({ marketing: toggle, measurement: toggle });
	});
	return summarize(samples);
}

const results = SCENARIOS.map((count) => ({
	iframeCount: count,
	v2: runV2(count),
	v3: runV3(count),
}));

console.log('# Iframe blocker — v2 vs v3 (µs per consent change)\n');
console.log(`Iterations per scenario: ${ITERATIONS}\n`);
console.log('| Iframes | v2 median | v3 median | Δ | v2 p95 | v3 p95 | Δ |');
console.log('|---:|---:|---:|---:|---:|---:|---:|');
for (const r of results) {
	console.log(
		`| ${r.iframeCount} | ${r.v2.median.toFixed(2)} | ${r.v3.median.toFixed(
			2
		)} | **${pct(r.v2.median, r.v3.median)}** | ${r.v2.p95.toFixed(
			2
		)} | ${r.v3.p95.toFixed(2)} | **${pct(r.v2.p95, r.v3.p95)}** |`
	);
}

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/core-v3-runtime';
mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'iframe-blocker-compare.json'),
	`${JSON.stringify(
		{
			suite: 'iframe-blocker-compare',
			generatedAt: new Date().toISOString(),
			iterations: ITERATIONS,
			results,
		},
		null,
		2
	)}\n`
);
