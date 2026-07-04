#!/usr/bin/env bun
/**
 * Hosted init comparison — v2 `initConsentManager` vs v3
 * `commands.init()` + `createHostedTransport`.
 *
 * Both sides run with a mocked fetch that returns a fixed banner payload
 * immediately, so the only thing we're measuring is the framework
 * overhead around the network call — not the network itself.
 *
 * This is the like-for-like answer to "v3 still needs /init, right?":
 * yes, and the cost is roughly equivalent to the raw fetch + a
 * single snapshot-advance + listener notification, with none of v2's
 * construction-time side effects.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { configureConsentManager, createConsentManagerStore } from 'c15t';
import {
	createConsentKernel,
	createHostedTransport,
	type InitResponse,
} from 'c15t/v3';
import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

const INIT_PAYLOAD: InitResponse = {
	jurisdiction: 'GDPR',
	showConsentBanner: true,
	resolvedOverrides: { country: 'DE' },
};

const V2_API_PAYLOAD = {
	showConsentBanner: true,
	jurisdiction: { code: 'GDPR' },
	translations: { language: 'en', translations: {} },
};

const mockFetch = async (_input: RequestInfo | URL, _init?: RequestInit) =>
	new Response(JSON.stringify(INIT_PAYLOAD), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});

// v2 expects showConsentBanner on a specific interface; point its mocks
// at a v2-shaped payload.
const v2Fetch = async (_input: RequestInfo | URL, _init?: RequestInit) =>
	new Response(JSON.stringify(V2_API_PAYLOAD), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});

const injectedFetch = mockFetch as unknown as typeof globalThis.fetch;
const BACKEND_URL = 'http://bench.example.com/api/c15t';

function measureSync(iterations: number, fn: () => void): number[] {
	const samples: number[] = [];
	for (let i = 0; i < iterations; i += 1) {
		const start = performance.now();
		fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
}

async function measureAsync(
	iterations: number,
	fn: () => Promise<void>
): Promise<number[]> {
	const samples: number[] = [];
	for (let i = 0; i < iterations; i += 1) {
		const start = performance.now();
		await fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
}

function summarize(samples: number[]) {
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

// ---- v2: createConsentManagerStore already fires initConsentManager at
//         construction, so construction + init are one metric. Second
//         metric measures an explicit repeat-init call.

globalThis.fetch = v2Fetch as unknown as typeof globalThis.fetch;

const v2Manager = configureConsentManager({ mode: 'hosted' });

const v2ConstructWithHostedFetch = measureSync(ITERATIONS, () => {
	createConsentManagerStore(v2Manager, {
		initialConsentCategories: ['necessary', 'marketing', 'measurement'],
	});
});

const v2ExplicitInit = await measureAsync(ITERATIONS, async () => {
	const store = createConsentManagerStore(v2Manager, {
		initialConsentCategories: ['necessary', 'marketing', 'measurement'],
	});
	await store.getState().initConsentManager();
});

// ---- v3: createConsentKernel is pure — construction alone fires nothing.
//         commands.init is explicit and deterministic.
//
//         The transport receives its fetch via option injection; we do
//         not reassign globalThis.fetch here (Bun validates URLs eagerly
//         on the native binding).

const v3KernelOnly = measureSync(ITERATIONS, () => {
	createConsentKernel({
		transport: createHostedTransport({
			backendURL: BACKEND_URL,
			fetch: injectedFetch,
		}),
	});
});

const v3InitCall = await measureAsync(ITERATIONS, async () => {
	const kernel = createConsentKernel({
		transport: createHostedTransport({
			backendURL: BACKEND_URL,
			fetch: injectedFetch,
		}),
	});
	await kernel.commands.init();
});

function row(label: string, samples: number[]) {
	const s = summarize(samples);
	return `| ${label} | ${s.avg.toFixed(2)} | ${s.median.toFixed(2)} | ${s.p95.toFixed(2)} |`;
}

const v2ExplicitSummary = summarize(v2ExplicitInit);
const v3InitSummary = summarize(v3InitCall);
const deltaPct =
	((v3InitSummary.median - v2ExplicitSummary.median) /
		v2ExplicitSummary.median) *
	100;

console.log('# Hosted init — v2 vs v3 (mocked fetch, sync µs)\n');
console.log(`Iterations per metric: ${ITERATIONS}\n`);
console.log('| Metric | avg | median | p95 |');
console.log('|---|---:|---:|---:|');
console.log(
	row(
		'v2 createConsentManagerStore (side-effecting, includes init)',
		v2ConstructWithHostedFetch
	)
);
console.log(
	row('v2 createStore + explicit initConsentManager', v2ExplicitInit)
);
console.log(row('v3 createConsentKernel (pure, no init fire)', v3KernelOnly));
console.log(
	row('v3 createKernel + commands.init (hosted transport)', v3InitCall)
);

console.log('');
console.log(`## Delta\n`);
console.log(
	`v3 init (median) vs v2 init (median): ${deltaPct.toFixed(1)}%. Both paths call ` +
		`a mocked fetch once; v3 adds snapshot-advance + listener notification; ` +
		`v2 adds banner state merge + window write + onConsentSet replay.`
);

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/core-v3-runtime';

mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'hosted-init-compare.json'),
	`${JSON.stringify(
		{
			suite: 'hosted-init-compare',
			generatedAt: new Date().toISOString(),
			iterations: ITERATIONS,
			v2: {
				construct: summarize(v2ConstructWithHostedFetch),
				explicitInit: v2ExplicitSummary,
			},
			v3: {
				kernelOnly: summarize(v3KernelOnly),
				initCall: v3InitSummary,
			},
		},
		null,
		2
	)}\n`
);
