/**
 * Shapes shared by the measurement modules, the reporter, and the stored artifact.
 *
 * The artifact mirrors `BenchmarkResult` from `@c15t/benchmarking` closely enough
 * that a reader who knows the web reports recognises it, but the mobile suite is
 * row-oriented: one contract budget maps to one row, and a row that could not be
 * measured stays in the table with a reason instead of disappearing.
 */

import type { BenchmarkEnvironment } from '@c15t/benchmarking/schema';

/** Which implementation a measurement describes. */
export type MobileSurface =
	| 'swift-core'
	| 'kotlin-core'
	| 'react-native-js'
	| 'bundle';

/** Units the mobile harness emits. A superset of the shared metric units. */
export type MobileUnit = 'ms' | 'us' | 'bytes' | 'count' | 'percent';

/** Where a ceiling came from. Only `contract` rows quote `native/CONTRACT.md`. */
export type BudgetSource = 'contract' | 'allowance';

/**
 * A row's outcome. Whether the row has a ceiling is separate: `budget` is `null`
 * for a measured row the contract sets no number for.
 *
 * - `measured`: a number was produced.
 * - `not-measured`: the machine could not produce one. The row stays in the table
 *   and carries `reason`.
 */
export type RowStatus = 'measured' | 'not-measured';

/** One line of the report. */
export interface MobileBenchRow {
	/** Stable key, also the key into `budgets.json`. */
	id: string;
	/** Human label for the table. */
	label: string;
	surface: MobileSurface;
	status: RowStatus;
	unit: MobileUnit;
	/** Measured value in `unit`, or `null` when nothing was measured. */
	value: number | null;
	/** Number of measured samples behind `value`. */
	samples: number;
	/** Ceiling from `budgets.json`, when the row has one. */
	budget: number | null;
	budgetSource: BudgetSource | null;
	/** Required when `status` is `not-measured`. */
	reason?: string;
	/** Short qualifier shown in the table: fixture size, store kind, and so on. */
	detail?: string;
}

/** One budget as written in `budgets.json`. */
export interface MobileBudget {
	max: number;
	unit: MobileUnit;
	source: BudgetSource;
	note: string;
}

/** Sampling plan, also editable in `budgets.json`. */
export interface MobileSampling {
	warmupIterations: number;
	measuredIterations: number;
	idleWindowMs: number;
	quickIdleWindowMs: number;
	quickWarmupIterations: number;
	quickMeasuredIterations: number;
	subsequentRunDiffTolerancePercent: number;
	/**
	 * Fresh processes behind the cold-start rows.
	 *
	 * One process is one sample: a second launch inside the first process is warm,
	 * which is the thing being excluded.
	 */
	coldStartProcesses: number;
	/** Cold-start processes in `--quick`, where each one still costs a spawn. */
	quickColdStartProcesses: number;
	/** Banner mounts behind the warm interactivity median. */
	uiMountIterations: number;
	/** Banner mounts in `--quick`. */
	quickUiMountIterations: number;
}

/** Everything one run produces. Written to disk so a later run can diff. */
export interface MobileBenchArtifact {
	schemaVersion: number;
	suite: 'mobile-runtime';
	package: string;
	runtime: string;
	timestamp: string;
	commitSha: string;
	gitDirty: boolean | null;
	environment: BenchmarkEnvironment;
	contract: string;
	/** The budgets this run was gated against, verbatim. */
	budgets: Record<string, MobileBudget>;
	sampling: MobileSampling;
	/** Every row, measured or not, in report order. */
	rows: MobileBenchRow[];
	notes: string[];
	/** Set only when a previous artifact was on disk. */
	previous?: MobileBenchDiffSummary;
}

/** Outcome of comparing two artifacts, row by row. */
export interface MobileBenchDiffRow {
	id: string;
	previous: number | null;
	current: number;
	delta: number | null;
	deltaPercent: number | null;
	/** True when the regression is larger than the sampling tolerance. */
	flagged: boolean;
}

export interface MobileBenchDiffSummary {
	previousCommitSha: string;
	previousTimestamp: string;
	tolerancePercent: number;
	rows: MobileBenchDiffRow[];
}

/** Aggregated gate outcome for the run. */
export interface MobileBenchCheck {
	enforced: boolean;
	ok: boolean;
	failed: string[];
	/** Contract rows that could not be evaluated because they were not measured. */
	unmeasured: string[];
	measuredCount: number;
}
