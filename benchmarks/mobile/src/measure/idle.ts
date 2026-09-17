/**
 * Idle cost of a live consent subscription.
 *
 * A quiet window in a separate process, measured from the outside: CPU seconds
 * the child burned, and how much resident memory it grew. Reported as a share of
 * one core so the number means the same on an 8-core laptop and a 4-core runner.
 *
 * The child runs under `node --import tsx`, the same loader the rest of this
 * harness runs under, so `react-native` resolves to the bench stub through
 * `tsconfig.json` in both. Bun is not used here: it skips tsconfig `paths` for
 * specifiers reached from inside `node_modules`, which lands the child on the
 * real `react-native` entry file. That file is Flow-typed and Bun cannot parse
 * it, so the row would carry a parser error instead of a number.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** What the quiet window produced. */
export interface IdleResult {
	cpuPercentOfOneCore: number;
	rssGrowthBytes: number;
	heapGrowthBytes: number;
	elapsedMs: number;
	/** Live native listeners at the end of the window. */
	listeners: number;
	settleMs: number;
	unavailable?: string;
}

/**
 * Locate the tsx loader, so the child strips TypeScript the same way the parent
 * does and honours the same `tsconfig.json` path aliases.
 *
 * @returns An `--import` argument, or `undefined` when tsx is not installed.
 */
const require = createRequire(import.meta.url);
const tsxImport = function tsxImport(): string | undefined {
	try {
		return require.resolve('tsx');
	} catch {
		return undefined;
	}
};

interface ChildReport {
	elapsedMs: number;
	listeners: number;
	settleMs: number;
	memory: { heapGrowthBytes: number; rssGrowthBytes: number; rssBytes: number };
	work: { cpuSystemMs: number; cpuUserMs: number };
}

/**
 * Measure one quiet window.
 *
 * @param windowMs - How long the child stays idle.
 * @returns The idle numbers, or `unavailable` with the reason.
 */
export const measureIdle = function measureIdle(
	windowMs: number,
	settleMs = 2000
): IdleResult {
	const packageDir = resolve(HERE, '..', '..');
	const subject = resolve(HERE, '..', 'support', 'idle-subject.ts');
	const tsconfig = resolve(packageDir, 'tsconfig.json');
	const loader = tsxImport();

	if (loader === undefined) {
		return {
			cpuPercentOfOneCore: 0,
			elapsedMs: 0,
			heapGrowthBytes: 0,
			listeners: 0,
			rssGrowthBytes: 0,
			settleMs,
			unavailable:
				'tsx is not resolvable from this package, so the quiet window has no runner',
		};
	}

	const child = spawnSync(
		process.execPath,
		['--import', loader, subject, String(windowMs), String(settleMs)],
		{
			cwd: packageDir,
			encoding: 'utf8',
			env: { ...process.env, TSX_TSCONFIG_PATH: tsconfig },
			maxBuffer: 8 * 1024 * 1024,
			timeout: windowMs + 120000,
		}
	);

	if (child.error) {
		return {
			cpuPercentOfOneCore: 0,
			elapsedMs: 0,
			heapGrowthBytes: 0,
			listeners: 0,
			rssGrowthBytes: 0,
			settleMs: 0,
			unavailable: `the idle process could not start: ${child.error.message}`,
		};
	}

	if (child.status !== 0) {
		return {
			cpuPercentOfOneCore: 0,
			elapsedMs: 0,
			heapGrowthBytes: 0,
			listeners: 0,
			rssGrowthBytes: 0,
			settleMs: 0,
			unavailable: `the idle process exited ${String(child.status)}: ${(child.stderr ?? '').slice(0, 400)}`,
		};
	}

	let report: ChildReport;
	try {
		report = JSON.parse(String(child.stdout)) as ChildReport;
	} catch {
		return {
			cpuPercentOfOneCore: 0,
			elapsedMs: 0,
			heapGrowthBytes: 0,
			listeners: 0,
			rssGrowthBytes: 0,
			settleMs: 0,
			unavailable: `the idle process did not report JSON: ${String(child.stdout).slice(0, 200)}`,
		};
	}

	const cpuMs = report.work.cpuUserMs + report.work.cpuSystemMs;

	return {
		cpuPercentOfOneCore: Number(((cpuMs / report.elapsedMs) * 100).toFixed(4)),
		elapsedMs: report.elapsedMs,
		heapGrowthBytes: report.memory.heapGrowthBytes,
		listeners: report.listeners,
		rssGrowthBytes: report.memory.rssGrowthBytes,
		settleMs: report.settleMs,
	};
};
