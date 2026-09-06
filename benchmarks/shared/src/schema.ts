export const BENCHMARK_SCHEMA_VERSION = 1;

export type BenchmarkSuite =
	| 'core-runtime'
	| 'bundle'
	| 'browser-runtime'
	| 'script-lifecycle'
	| 'artifact'
	// Server-side query benchmarks for the backend rewrite (RFC 0004 §7).
	| 'backend-runtime';

export type BenchmarkFramework =
	| 'core'
	| 'react'
	| 'nextjs'
	| 'tanstack-start'
	| 'svelte'
	| 'solid'
	| 'vue'
	| 'astro'
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

export interface MetricBudget {
	metric: string;
	comparator:
		| 'delta-bytes-lte'
		| 'percent-lte'
		| 'absolute-and-percent-lte'
		| 'count-eq'
		| 'truthy-eq';
	threshold: number;
	secondaryThreshold?: number;
	description: string;
}

export interface MetricBudgetResult {
	metric: string;
	pass: boolean;
	comparator: MetricBudget['comparator'];
	actual: number | boolean | null;
	threshold: number;
	secondaryThreshold?: number;
	message: string;
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

export interface BenchmarkComparisonResult {
	schemaVersion: number;
	generatedAt: string;
	baseSha?: string;
	headSha?: string;
	results: {
		key: string;
		baseKey?: string;
		suite: BenchmarkSuite;
		package: string;
		framework: BenchmarkFramework;
		scenario: string;
		metrics: BenchmarkComparisonMetric[];
		budgets: MetricBudgetResult[];
		notes: string[];
	}[];
}
