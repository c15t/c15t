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
import { createIAB } from '@c15t/iab/v3';
import type { GlobalVendorList } from 'c15t/v3';
import { createConsentKernel } from 'c15t/v3';
import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();
// The IAB stub installs event listeners on window; give it one.
// biome-ignore lint/suspicious/noExplicitAny: bench stub
(globalThis.window as any).addEventListener = () => {};
// biome-ignore lint/suspicious/noExplicitAny: bench stub
(globalThis.window as any).removeEventListener = () => {};

// Build a synthetic GVL with N vendors and the standard 11 purposes +
// 2 special features. Larger vendor counts exercise the acceptAll hot
// loop.
function makeGvl(vendorCount: number): GlobalVendorList {
	const purposes: Record<number, unknown> = {};
	for (let i = 1; i <= 11; i += 1) {
		purposes[i] = { id: i, name: `Purpose ${i}`, description: '' };
	}
	const specialFeatures: Record<number, unknown> = {
		1: { id: 1, name: 'Geo', description: '' },
		2: { id: 2, name: 'Device', description: '' },
	};
	const vendors: Record<string, unknown> = {};
	for (let i = 1; i <= vendorCount; i += 1) {
		vendors[String(i)] = {
			id: i,
			name: `Vendor ${i}`,
			purposes: [1, 2, 3],
			legIntPurposes: [],
			flexiblePurposes: [],
			specialPurposes: [],
			features: [],
			specialFeatures: [],
			policyUrl: '',
		};
	}
	return {
		gvlSpecificationVersion: 3,
		vendorListVersion: 42,
		tcfPolicyVersion: 4,
		lastUpdated: '2026-01-01T00:00:00Z',
		purposes,
		specialPurposes: {},
		features: {},
		specialFeatures,
		stacks: {},
		vendors,
	} as unknown as GlobalVendorList;
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
	const iab = createIAB({ kernel, cmpId: 28, gvl });

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
		vendorCount,
		acceptAll: summarize(acceptSamples),
		rejectAll: summarize(rejectSamples),
		singleVendor: summarize(singleSamples),
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
	`${JSON.stringify({ suite: 'iab-compare', generatedAt: new Date().toISOString(), iterations: ITERATIONS, results }, null, 2)}\n`
);
