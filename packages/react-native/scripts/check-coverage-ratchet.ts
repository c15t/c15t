#!/usr/bin/env bun

/**
 * Enforces the coverage ratchet and names the files that broke it.
 *
 * Vitest's own threshold check compares the package aggregate only, so a failure
 * prints four percentages and no path, and finding the cause means reading a
 * table with one row per source file. This applies the same floors from
 * `vitest.config.ts` to the aggregate, then prints one line per file sitting
 * below them, worst first.
 *
 * It reads the `json-summary` report vitest just wrote instead of recomputing
 * anything, so the verdict and the HTML report can never disagree. Wired up as
 * `bun run --cwd packages/react-native test:coverage`.
 */

import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { coverageThresholds } from '../vitest.config';

type ThresholdKey = keyof typeof coverageThresholds;

interface CoverageMetrics {
	branches: { pct: number };
	functions: { pct: number };
	lines: { pct: number };
	statements: { pct: number };
}

interface Offender {
	failures: string[];
	path: string;
	/** Largest number of percentage points below a floor, as a negative number. */
	shortfall: number;
}

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SUMMARY_URL = new URL(
	'../coverage/coverage-summary.json',
	import.meta.url
);

/** A report older than this belongs to a run that no longer happened. */
const MAX_REPORT_AGE_MS = 10 * 60 * 1000;

/** Keeps a red run to one screen; the HTML report holds the rest. */
const MAX_REPORTED_FILES = 20;

const THRESHOLD_KEYS = Object.keys(coverageThresholds) as ThresholdKey[];

const failuresFor = function failuresFor(metrics: CoverageMetrics): string[] {
	return THRESHOLD_KEYS.filter(
		(key) => metrics[key].pct < coverageThresholds[key]
	).map((key) => `${key} ${metrics[key].pct}% < ${coverageThresholds[key]}%`);
};

const worstShortfall = function worstShortfall(
	metrics: CoverageMetrics
): number {
	return Math.min(
		...THRESHOLD_KEYS.map((key) => metrics[key].pct - coverageThresholds[key])
	);
};

const readReport = async function readReport(): Promise<
	Record<string, CoverageMetrics>
> {
	let content: string;
	try {
		content = await readFile(SUMMARY_URL, 'utf8');
	} catch {
		throw new Error(
			'no coverage report at coverage/coverage-summary.json. Run this through `bun run test:coverage`, which turns coverage on.'
		);
	}
	const ageMs = Date.now() - statSync(SUMMARY_URL).mtimeMs;
	if (ageMs > MAX_REPORT_AGE_MS) {
		throw new Error(
			`coverage report is ${Math.floor(ageMs / 60_000)} minutes old and does not describe this run. Run \`bun run test:coverage\`.`
		);
	}
	return JSON.parse(content) as Record<string, CoverageMetrics>;
};

const aggregate = function aggregate(metrics: CoverageMetrics): string {
	return THRESHOLD_KEYS.map((key) => `${key} ${metrics[key].pct}%`).join('  ');
};

const collectOffenders = function collectOffenders(
	report: Record<string, CoverageMetrics>
): Offender[] {
	const offenders: Offender[] = [];
	for (const [absolutePath, metrics] of Object.entries(report)) {
		if (absolutePath === 'total') {
			continue;
		}
		const failures = failuresFor(metrics);
		if (failures.length === 0) {
			continue;
		}
		offenders.push({
			failures,
			path: relative(PACKAGE_ROOT, absolutePath),
			shortfall: worstShortfall(metrics),
		});
	}
	return offenders.sort(
		(a, b) => a.shortfall - b.shortfall || a.path.localeCompare(b.path)
	);
};

/**
 * Bun appends arguments given to `bun run test:coverage <path>` to the last
 * command in the script, so they reach this process rather than vitest. A
 * filtered ratchet is not a thing worth running anyway: the floors are
 * package-wide, so a subset always fails on every file it left out.
 */
const rejectFilters = function rejectFilters(): void {
	const [filter] = process.argv.slice(2);
	if (filter) {
		throw new Error(
			`test:coverage gates the whole package, so \`${filter}\` is not a filter it accepts. For one subset run \`bun run test ${filter}\`.`
		);
	}
};

const main = async function main(): Promise<void> {
	rejectFilters();
	const report = await readReport();
	const { total } = report;
	if (!total) {
		throw new Error('coverage report has no `total` entry');
	}

	const floors = THRESHOLD_KEYS.map((key) => coverageThresholds[key]).join('/');
	const offenders = collectOffenders(report);

	if (failuresFor(total).length === 0) {
		console.log(
			`coverage ratchet passed: ${aggregate(total)} (floor ${floors})`
		);
		return;
	}

	console.error(
		`coverage ratchet failed: ${aggregate(total)} (floor ${floors})`
	);
	for (const [index, offender] of offenders
		.slice(0, MAX_REPORTED_FILES)
		.entries()) {
		console.error(
			`  ${index + 1}. ${offender.path}: ${offender.failures.join(', ')}`
		);
	}
	const hidden = offenders.length - MAX_REPORTED_FILES;
	if (hidden > 0) {
		console.error(`  and ${hidden} more: coverage/html/index.html`);
	}

	process.exitCode = 1;
};

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
