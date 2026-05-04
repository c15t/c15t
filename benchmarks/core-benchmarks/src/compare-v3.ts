#!/usr/bin/env bun
/**
 * Quick v2 → v3 delta reporter.
 *
 * Reads the v2 and v3 benchmark output dirs, prints a markdown table of
 * p95 deltas per metric per fixture. Intended for continuous monitoring
 * during the v3 kernel rollout — run after every meaningful change.
 *
 * Usage:
 *   bun run bench && bun run bench:v3
 *   bunx tsx src/compare-v3.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Metric {
	name: string;
	p95: number;
	median: number;
}

interface BenchOutput {
	scenario: string;
	framework: string;
	metrics: Metric[];
}

// Map v3 metric names to their v2 equivalents so the comparison table
// pairs things up correctly. If a v3 metric has no direct v2 peer, leave
// it absent here — the comparator will show it as "v3-only".
const V3_TO_V2: Record<string, string> = {
	createConsentKernel: 'createConsentManagerStore',
	getSnapshot: 'store.getDisplayedConsents',
	setConsent: 'has()',
	saveAll: 'repeatVisitorInit',
	repeatVisitorInit: 'repeatVisitorInit',
	initConsentManager: 'initConsentManager',
};

function loadDir(dir: string): Map<string, BenchOutput> {
	const map = new Map<string, BenchOutput>();
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.json')) continue;
		const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
		map.set(data.scenario, data);
	}
	return map;
}

function pct(v2: number, v3: number): string {
	const d = ((v3 - v2) / v2) * 100;
	const sign = d >= 0 ? '+' : '';
	return `${sign}${d.toFixed(1)}%`;
}

const v2Dir =
	process.env.V2_BENCH_DIR ?? '../../.benchmarks/current/core-runtime';
const v3Dir =
	process.env.V3_BENCH_DIR ?? '../../.benchmarks/current/core-v3-runtime';

const v2 = loadDir(v2Dir);
const v3 = loadDir(v3Dir);

console.log('# c15t v3 Kernel vs v2 Baseline (p95, µs)\n');

for (const scenario of ['tiny', 'small', 'medium', 'large', 'xlarge']) {
	const v2Run = v2.get(scenario);
	const v3Run = v3.get(scenario);
	if (!v2Run || !v3Run) continue;

	console.log(`## ${scenario}\n`);
	console.log('| v3 metric | v2 peer | v2 p95 | v3 p95 | delta |');
	console.log('|---|---|---:|---:|---:|');

	const v2ByName = new Map(v2Run.metrics.map((m) => [m.name, m]));

	for (const v3Metric of v3Run.metrics) {
		const v2Name = V3_TO_V2[v3Metric.name] ?? v3Metric.name;
		const v2Metric = v2ByName.get(v2Name);
		if (v2Metric) {
			console.log(
				`| \`${v3Metric.name}\` | \`${v2Name}\` | ${v2Metric.p95.toFixed(2)} | ${v3Metric.p95.toFixed(2)} | **${pct(v2Metric.p95, v3Metric.p95)}** |`
			);
		} else {
			console.log(
				`| \`${v3Metric.name}\` | — | — | ${v3Metric.p95.toFixed(2)} | v3-only |`
			);
		}
	}
	console.log('');
}
