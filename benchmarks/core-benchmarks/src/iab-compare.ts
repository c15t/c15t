#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
/**
 * IAB TCF comparison — v2 vs v3.
 *
 * Measures:
 *   1. acceptAll cycle (flip every vendor + purpose, propagate c15t consents)
 *   2. rejectAll cycle (same, inverted)
 *   3. kernel.set.iab single-vendor consent update
 *
 * Note: this bench does NOT measure TCF string encoding because that
 * requires loading @iabtechlabtcf/core at runtime and introduces
 * variance that's more about the encoder lib than c15t. The c15t
 * framework overhead is the acceptAll/rejectAll orchestration.
 */
import { join } from 'node:path';

import type { GlobalVendorList } from '@c15t/core/v3';
import { createConsentKernel } from '@c15t/core/v3';
import { createIAB } from '@c15t/iab/v3';

import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();
// The IAB stub installs event listeners on window; give it one.
// oxlint-disable-next-line typescript/no-explicit-any -- bench stub
(globalThis.window as any).addEventListener = () => {
	/* empty */
};
// oxlint-disable-next-line typescript/no-explicit-any -- bench stub
(globalThis.window as any).removeEventListener = () => {
	/* empty */
};

// Build a synthetic GVL with N vendors and the standard 11 purposes +
// 2 special features. Larger vendor counts exercise the acceptAll hot
// loop.
const makeGvl = function makeGvl(vendorCount: number): GlobalVendorList {
	const purposes: Record<number, unknown> = {};
	for (let i = 1; i <= 11; i += 1) {
		purposes[i] = { description: '', id: i, name: `Purpose ${i}` };
	}
	const specialFeatures: Record<number, unknown> = {
		1: { description: '', id: 1, name: 'Geo' },
		2: { description: '', id: 2, name: 'Device' },
	};
	const vendors: Record<string, unknown> = {};
	for (let i = 1; i <= vendorCount; i += 1) {
		vendors[String(i)] = {
			features: [],
			flexiblePurposes: [],
			id: i,
			legIntPurposes: [],
			name: `Vendor ${i}`,
			policyUrl: '',
			purposes: [1, 2, 3],
			specialFeatures: [],
			specialPurposes: [],
		};
	}
	return {
		features: {},
		gvlSpecificationVersion: 3,
		lastUpdated: '2026-01-01T00:00:00Z',
		purposes,
		specialFeatures,
		specialPurposes: {},
		stacks: {},
		tcfPolicyVersion: 4,
		vendorListVersion: 42,
		vendors,
	} as unknown as GlobalVendorList;
};

const measureSync = function measureSync(
	iterations: number,
	fn: () => void
): number[] {
	const samples: number[] = [];
	for (let i = 0; i < iterations; i += 1) {
		const start = performance.now();
		fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
};

interface Stats {
	avg: number;
	median: number;
	p95: number;
}
const summarize = function summarize(samples: number[]): Stats {
	const sorted = [...samples].sort((a, b) => a - b);
	return {
		avg: samples.reduce((a, b) => a + b, 0) / samples.length,
		median: sorted[Math.floor(sorted.length / 2)] ?? 0,
		p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
	};
};

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '30');
const SCENARIOS = [50, 500];

interface Result {
	vendorCount: number;
	acceptAll: Stats;
	rejectAll: Stats;
	singleVendor: Stats;
}

const results: Result[] = [];

for (const vendorCount of SCENARIOS) {
	const gvl = makeGvl(vendorCount);
	const kernel = createConsentKernel();
	const iab = createIAB({ cmpId: 28, gvl, kernel });

	const acceptSamples = measureSync(ITERATIONS, () => {
		iab.acceptAll();
	});
	const rejectSamples = measureSync(ITERATIONS, () => {
		iab.rejectAll();
	});
	let toggle = false;
	const singleSamples = measureSync(ITERATIONS, () => {
		toggle = !toggle;
		iab.setVendorConsent(1, toggle);
	});

	results.push({
		acceptAll: summarize(acceptSamples),
		rejectAll: summarize(rejectSamples),
		singleVendor: summarize(singleSamples),
		vendorCount,
	});

	iab.dispose();
}

console.log('# IAB module — v3 standalone (µs, framework overhead)\n');
console.log(`Iterations: ${ITERATIONS}\n`);
console.log(
	'| Vendors | acceptAll median | acceptAll p95 | rejectAll median | singleVendor median |'
);
console.log('|---:|---:|---:|---:|---:|');
for (const r of results) {
	console.log(
		`| ${r.vendorCount} | ${r.acceptAll.median.toFixed(2)} | ${r.acceptAll.p95.toFixed(2)} | ${r.rejectAll.median.toFixed(2)} | ${r.singleVendor.median.toFixed(2)} |`
	);
}

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/core-v3-runtime';
mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'iab-compare.json'),
	`${JSON.stringify({ generatedAt: new Date().toISOString(), iterations: ITERATIONS, results, suite: 'iab-compare' }, null, 2)}\n`
);
