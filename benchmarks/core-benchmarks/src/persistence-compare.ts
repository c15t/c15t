#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
/**
 * Persistence comparison: v2 vs v3.
 *
 * Measures the save-cycle: time from a consent save call to the
 * persisted cookie + localStorage being written. v2 does this inline
 * in the store's saveConsents; v3 does it in the persistence module
 * subscribed to the kernel.
 *
 * Scenarios:
 *   - saveAll (flip all categories true, write)
 *   - saveNone (flip all false except necessary)
 *   - partial save (5 flips, one write)
 */
import { join } from 'node:path';
import {
	configureConsentManager,
	createConsentManagerStore,
	deleteConsentFromStorage,
} from 'c15t';
import { createConsentKernel } from 'c15t/v3';
import { createPersistence } from 'c15t/v3/modules/persistence';
import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

function measureAsync(
	iterations: number,
	fn: () => Promise<void>
): Promise<number[]> {
	return (async () => {
		const samples: number[] = [];
		for (let i = 0; i < iterations; i += 1) {
			const start = performance.now();
			await fn();
			samples.push((performance.now() - start) * 1000);
		}
		return samples;
	})();
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

function pct(a: number, b: number): string {
	const d = ((b - a) / a) * 100;
	return (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
}

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '200');

async function runV2SaveAll(): Promise<Stats> {
	const manager = configureConsentManager({ mode: 'offline' });
	const store = createConsentManagerStore(manager, {
		initialConsentCategories: [
			'necessary',
			'functionality',
			'marketing',
			'measurement',
			'experience',
		],
	});
	const samples = await measureAsync(ITERATIONS, async () => {
		deleteConsentFromStorage();
		await store.getState().saveConsents('all');
	});
	return summarize(samples);
}

async function runV3SaveAll(): Promise<Stats> {
	const kernel = createConsentKernel({
		initialConsents: {
			necessary: true,
			functionality: false,
			marketing: false,
			measurement: false,
			experience: false,
		},
	});
	const persistence = createPersistence({ kernel, skipHydration: true });
	const samples = await measureAsync(ITERATIONS, async () => {
		deleteConsentFromStorage();
		await kernel.commands.save('all');
		// Let the debounced microtask complete.
		await Promise.resolve();
		await Promise.resolve();
	});
	persistence.dispose();
	return summarize(samples);
}

const v2 = await runV2SaveAll();
const v3 = await runV3SaveAll();

console.log('# Persistence — v2 vs v3 (µs per saveAll round-trip)\n');
console.log(`Iterations: ${ITERATIONS}\n`);
console.log('| Path | median | p95 |');
console.log('|---|---:|---:|');
console.log(
	`| v2 saveConsents('all') | ${v2.median.toFixed(2)} | ${v2.p95.toFixed(2)} |`
);
console.log(
	`| v3 kernel.save + debounced write | ${v3.median.toFixed(2)} | ${v3.p95.toFixed(2)} |`
);
console.log(
	`| Δ | **${pct(v2.median, v3.median)}** | **${pct(v2.p95, v3.p95)}** |`
);

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/core-v3-runtime';
mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'persistence-compare.json'),
	`${JSON.stringify(
		{
			suite: 'persistence-compare',
			generatedAt: new Date().toISOString(),
			iterations: ITERATIONS,
			v2,
			v3,
		},
		null,
		2
	)}\n`
);
