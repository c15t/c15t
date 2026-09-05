export const BENCHMARK_SCHEMA_VERSION = 1;

export type BenchmarkSuite =
	| 'core-runtime'
	| 'bundle'
	| 'browser-runtime'
	| 'script-lifecycle'
	| 'artifact'
	// Server-side query benchmarks for the backend rewrite (RFC 0004 §7).
	| 'backend-runtime'
	// Node-side policy wire payload and synchronous resolution measurements
	// over fixed policy fixtures (issue #1025).
	| 'policy-runtime';

export type BenchmarkFramework =
	| 'core'
	| 'react'
	| 'nextjs'
	| 'svelte'
	| 'solid'
	| 'vue'
	| 'backend';

export interface BenchmarkEnvironment {
	os: string;
	arch: string;
	bunVersion?: string;
	nodeVersion?: string;
	browserVersion?: string;
	ci: boolean;
}

export interface BenchmarkFixtureDescriptor {
	name: string;
	consentCount: number;
	scriptCount: number;
	localeCount: number;
	themeComplexity: 'minimal' | 'complex';
	notes?: string[];
	/**
	 * Server-side shape, for `backend-runtime` arms. Optional so existing
	 * browser and bundle reports keep validating unchanged.
	 */
	engine?: 'postgres' | 'mysql' | 'sqlite';
	/** Seeded row counts, keyed by table. */
	rowCounts?: Record<string, number>;
	/**
	 * Which migrations were applied. Load-bearing: RFC 0004 §11.4 requires
	 * migration 1 and migration 2 be reported separately, or an indexing win
	 * is silently attributed to the rewrite.
	 */
	migrations?: string[];
}

export interface MetricSampleSet {
	name: string;
	unit: 'ns' | 'us' | 'ms' | 'bytes' | 'count' | 'ratio';
	samples: number[];
	avg: number;
	median: number;
	p95: number;
}

/**
 * Named base arms a budget can compare against instead of the same-key
 * base result. `v2` means the v2-era artifacts described in
 * `benchmarks/BASELINE.md`; the comparison runner only evaluates such a
 * budget when an artifact directory for that arm is supplied.
 */
export type BenchmarkBaseArm = 'v2';

export interface MetricBudget {
	metric: string;
	comparator:
		| 'delta-bytes-lte'
		| 'percent-lte'
		| 'absolute-and-percent-lte'
		| 'count-eq'
		| 'truthy-eq'
		/**
		 * Head median must be `<= threshold`. No base metric is consulted, so
		 * this is the comparator for additive behavior that has no
		 * pre-change counterpart. The threshold must be an explicit,
		 * documented allowance.
		 */
		| 'absolute-lte';
	threshold: number;
	secondaryThreshold?: number;
	description: string;
	/**
	 * Compare against a named base arm rather than the same-key base
	 * result. Missing arm artifacts leave the budget unevaluated, which the
	 * comparison runner reports explicitly and treats as a gate failure.
	 */
	baseArm?: BenchmarkBaseArm;
	/**
	 * Metric name to read from the arm artifact when the arm's runner named
	 * the equivalent operation differently (for example the v2 runner's
	 * `createConsentManagerStore` for `createConsentKernel`).
	 */
	baseArmMetric?: string;
}

export type MetricBudgetStatus =
	| 'evaluated'
	| 'missing-head-metric'
	| 'missing-base-metric'
	| 'unevaluated-arm';

export interface MetricBudgetResult {
	metric: string;
	pass: boolean;
	comparator: MetricBudget['comparator'];
	actual: number | boolean | null;
	threshold: number;
	secondaryThreshold?: number;
	message: string;
	/** Defaults to `evaluated` for results written by older runners. */
	status?: MetricBudgetStatus;
	baseArm?: BenchmarkBaseArm;
}

export type BenchmarkMetadataValue = string | number | boolean | null;

export interface BenchmarkMetadata {
	[key: string]: BenchmarkMetadataValue | BenchmarkMetadataValue[] | undefined;
	profile?: string;
	initLatencyMs?: number;
}

export interface BrowserNavigationTimingMetrics {
	ttfbMs: number | null;
	htmlDoneMs: number | null;
	domContentLoadedMs: number | null;
	loadEventMs: number | null;
}

export interface BenchmarkResult {
	schemaVersion: number;
	suite: BenchmarkSuite;
	package: string;
	framework: BenchmarkFramework;
	runtime: string;
	scenario: string;
	commitSha: string;
	baseSha?: string;
	timestamp: string;
	environment: BenchmarkEnvironment;
	fixture: BenchmarkFixtureDescriptor;
	metadata?: BenchmarkMetadata;
	metrics: MetricSampleSet[];
	budgetDefinitions?: MetricBudget[];
	budgets: MetricBudgetResult[];
	notes: string[];
}

export interface BenchmarkComparisonMetric {
	name: string;
	unit: MetricSampleSet['unit'];
	baseMedian: number | null;
	headMedian: number;
	delta: number | null;
	deltaPercent: number | null;
}

export type BenchmarkComparisonStatus = 'compared' | 'missing-base';

export interface BenchmarkComparisonEntry {
	key: string;
	baseKey?: string;
	suite: BenchmarkSuite;
	package: string;
	framework: BenchmarkFramework;
	scenario: string;
	/** Defaults to `compared` for reports written by older runners. */
	status?: BenchmarkComparisonStatus;
	baseCommitSha?: string;
	headCommitSha?: string;
	metrics: BenchmarkComparisonMetric[];
	budgets: MetricBudgetResult[];
	notes: string[];
}

/**
 * Coverage accounting for a comparison run. Every count is explicit so a
 * gate cannot succeed by measuring nothing.
 */
export interface BenchmarkComparisonSummary {
	enforce: boolean;
	ok: boolean;
	results: {
		expected: number;
		compared: number;
		missingHead: string[];
		missingBase: string[];
		unexpected: string[];
	};
	budgets: {
		expected: number;
		evaluated: number;
		passed: number;
		failed: number;
		missingHeadMetric: number;
		missingBaseMetric: number;
		unevaluatedArm: number;
		/** Expected budgets the head artifact does not define at all. */
		missingDefinitions: string[];
		/**
		 * Expected budgets the head artifact defines with a different
		 * comparator, threshold, secondary threshold, or arm mapping. A
		 * weaker same-name budget is a gate failure, not a match.
		 */
		definitionMismatches: string[];
		/** Head budgets no expectation lists; reported, never counted as coverage. */
		unexpectedDefinitions: string[];
	};
	/** Named base arms supplied to the run, with their artifact provenance. */
	baseArms: Record<string, { results: number; commitShas: string[] }>;
	failures: string[];
}

export interface BenchmarkComparisonResult {
	schemaVersion: number;
	generatedAt: string;
	baseSha?: string;
	headSha?: string;
	results: BenchmarkComparisonEntry[];
	summary?: BenchmarkComparisonSummary;
}
