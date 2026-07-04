#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
/**
 * Network blocker comparison: v2 vs v3.
 *
 * Measures per-request overhead when the blocker is installed. Both
 * paths patch `window.fetch` and `XMLHttpRequest.prototype`. We fire
 * N fetch() calls and N XHR calls against a mocked backend and measure
 * the wrapper overhead — the interesting cost is the per-request decide()
 * call, not the network itself.
 *
 * Scenarios:
 *   - 3 rules, 1000 fetch calls (half allowed, half blocked)
 *   - 3 rules, 1000 XHR calls (same split)
 *   - install/dispose lifecycle cost
 */
import { join } from 'node:path';
import { configureConsentManager, createConsentManagerStore } from 'c15t';
import { createConsentKernel } from 'c15t/v3';
import {
	createNetworkBlocker,
	type NetworkBlockerRule,
} from 'c15t/v3/modules/network-blocker';
import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

// Pretend browser: minimal XMLHttpRequest + window.fetch on window.
class StubXHR {
	onerror: ((e: unknown) => void) | null = null;
	listeners = new Map<string, Array<(e: unknown) => void>>();
	open(_m: string, _u: string) {}
	send() {}
	abort() {}
	addEventListener(e: string, h: (e: unknown) => void) {
		const b = this.listeners.get(e) ?? [];
		b.push(h);
		this.listeners.set(e, b);
	}
	removeEventListener() {}
	dispatchEvent() {
		return true;
	}
}
// biome-ignore lint/suspicious/noExplicitAny: node global stub
(globalThis as any).XMLHttpRequest = StubXHR;
// Ensure window.fetch exists and returns cheaply.
const baseFetch = async () => new Response('ok', { status: 200 });
// biome-ignore lint/suspicious/noExplicitAny: node stub
(globalThis.window as any).fetch = baseFetch;
// v2's blocker dispatches ProgressEvent on XHR errors; stub it.
if (
	typeof (globalThis as unknown as { ProgressEvent?: unknown })
		.ProgressEvent === 'undefined'
) {
	// biome-ignore lint/suspicious/noExplicitAny: minimal stub
	(globalThis as any).ProgressEvent = class {
		type: string;
		constructor(type: string) {
			this.type = type;
		}
	};
}

const RULES: NetworkBlockerRule[] = [
	{ domain: 'google-analytics.com', category: 'marketing' },
	{ domain: 'facebook.net', category: 'marketing' },
	{ domain: 'hotjar.com', category: 'measurement' },
];

// Target URLs: 1 in 3 hits a blocked rule (marketing declined).
const URLS = [
	'https://google-analytics.com/collect',
	'https://api.example.com/user',
	'https://cdn.other.com/font.woff',
	'https://facebook.net/sdk.js',
	'https://api.example.com/items',
	'https://hotjar.com/trace',
];

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

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '1000');

function pct(v2: number, v3: number): string {
	const d = ((v3 - v2) / v2) * 100;
	const sign = d >= 0 ? '+' : '';
	return `${sign}${d.toFixed(1)}%`;
}

// ---- v2: createConsentManagerStore installs blocker via networkBlocker config

function runV2Fetch(): number[] {
	const manager = configureConsentManager({ mode: 'offline' });
	createConsentManagerStore(manager, {
		initialConsentCategories: ['necessary', 'functionality'],
		// biome-ignore lint/suspicious/noExplicitAny: v2 config shape
		networkBlocker: {
			enabled: true,
			rules: RULES,
			logBlockedRequests: false,
		} as any,
	});
	let i = 0;
	return measureSync(ITERATIONS, () => {
		void window.fetch(URLS[i++ % URLS.length] as string);
	});
}

function runV2XHR(): number[] {
	const manager = configureConsentManager({ mode: 'offline' });
	createConsentManagerStore(manager, {
		initialConsentCategories: ['necessary', 'functionality'],
		// biome-ignore lint/suspicious/noExplicitAny: v2 config shape
		networkBlocker: {
			enabled: true,
			rules: RULES,
			logBlockedRequests: false,
		} as any,
	});
	let i = 0;
	return measureSync(ITERATIONS, () => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', URLS[i++ % URLS.length] as string);
		xhr.send();
	});
}

// ---- v3: createNetworkBlocker hook-style

function runV3Fetch(): number[] {
	const kernel = createConsentKernel({
		initialConsents: {
			necessary: true,
			functionality: true,
			marketing: false,
			measurement: false,
			experience: false,
		},
	});
	createNetworkBlocker({
		kernel,
		rules: RULES,
		logBlockedRequests: false,
	});
	let i = 0;
	return measureSync(ITERATIONS, () => {
		void window.fetch(URLS[i++ % URLS.length] as string);
	});
}

function runV3XHR(): number[] {
	const kernel = createConsentKernel({
		initialConsents: {
			necessary: true,
			functionality: true,
			marketing: false,
			measurement: false,
			experience: false,
		},
	});
	createNetworkBlocker({
		kernel,
		rules: RULES,
		logBlockedRequests: false,
	});
	let i = 0;
	return measureSync(ITERATIONS, () => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', URLS[i++ % URLS.length] as string);
		xhr.send();
	});
}

const v2Fetch = summarize(runV2Fetch());
const v3Fetch = summarize(runV3Fetch());
const v2Xhr = summarize(runV2XHR());
const v3Xhr = summarize(runV3XHR());

console.log('# Network blocker — v2 vs v3 (µs per request)\n');
console.log(`Iterations: ${ITERATIONS}\n`);
console.log('| Path | v2 median | v3 median | Δ | v2 p95 | v3 p95 | Δ |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
console.log(
	`| fetch | ${v2Fetch.median.toFixed(2)} | ${v3Fetch.median.toFixed(
		2
	)} | **${pct(v2Fetch.median, v3Fetch.median)}** | ${v2Fetch.p95.toFixed(
		2
	)} | ${v3Fetch.p95.toFixed(2)} | **${pct(v2Fetch.p95, v3Fetch.p95)}** |`
);
console.log(
	`| XHR | ${v2Xhr.median.toFixed(2)} | ${v3Xhr.median.toFixed(
		2
	)} | **${pct(v2Xhr.median, v3Xhr.median)}** | ${v2Xhr.p95.toFixed(
		2
	)} | ${v3Xhr.p95.toFixed(2)} | **${pct(v2Xhr.p95, v3Xhr.p95)}** |`
);

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/core-v3-runtime';
mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'network-blocker-compare.json'),
	`${JSON.stringify(
		{
			suite: 'network-blocker-compare',
			generatedAt: new Date().toISOString(),
			iterations: ITERATIONS,
			v2: { fetch: v2Fetch, xhr: v2Xhr },
			v3: { fetch: v3Fetch, xhr: v3Xhr },
		},
		null,
		2
	)}\n`
);
