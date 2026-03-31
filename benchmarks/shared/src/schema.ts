export const BENCHMARK_SCHEMA_VERSION = 1;

export type BenchmarkSuite =
	| 'core-runtime'
	| 'bundle'
	| 'browser-runtime'
	| 'script-lifecycle'
	| 'artifact';

export type BenchmarkFramework =
	| 'core'
	| 'react'
	| 'nextjs'
	| 'svelte'
	| 'solid'
	| 'vue';

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
	results: Array<{
		key: string;
		suite: BenchmarkSuite;
		package: string;
		framework: BenchmarkFramework;
		scenario: string;
		metrics: BenchmarkComparisonMetric[];
		budgets: MetricBudgetResult[];
		notes: string[];
	}>;
}
