import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
	BenchmarkResult,
	MetricSampleSet,
} from '../benchmarks/shared/src/schema';
import {
	readJson,
	summarizeMetric,
	summarizeNullableMetric,
	writeJson,
} from '../benchmarks/shared/src/utils';
import {
	iterationsPerRound,
	poolRoundDirectories,
	poolRoundResults,
	roundOrder,
} from './benchmark-rounds';

const result = (metrics: MetricSampleSet[]): BenchmarkResult => ({
	budgetDefinitions: [],
	budgets: [],
	commitSha: 'head',
	environment: { arch: 'x64', ci: true, os: 'linux' },
	fixture: {
		consentCount: 1,
		localeCount: 1,
		name: 'baseline',
		scriptCount: 0,
		themeComplexity: 'minimal',
	},
	framework: 'react',
	metadata: { visit: 'fresh' },
	metrics,
	notes: [],
	package: '@c15t/react-browser-bench',
	runtime: 'chromium',
	scenario: 'baseline',
	schemaVersion: 1,
	suite: 'browser-runtime',
	timestamp: '2026-10-07T00:00:00.000Z',
});

describe('roundOrder', () => {
	it('alternates which arm measures first', () => {
		expect([0, 1, 2].map(roundOrder)).toEqual([
			['base', 'head'],
			['head', 'base'],
			['base', 'head'],
		]);
	});
});

describe('iterationsPerRound', () => {
	it('never pools fewer samples than a single pass', () => {
		expect(iterationsPerRound(30, 3)).toBe('10');
		expect(iterationsPerRound(16, 3)).toBe('6');
	});
});

describe('poolRoundResults', () => {
	it('recomputes the median from every round', () => {
		const pooled = poolRoundResults(
			[
				result([summarizeMetric('bannerReadyMs', 'ms', [100, 101])]),
				result([summarizeMetric('bannerReadyMs', 'ms', [200, 201])]),
				result([summarizeMetric('bannerReadyMs', 'ms', [102, 103])]),
			],
			'baseline'
		);
		expect(pooled.metrics).toEqual([
			summarizeMetric('bannerReadyMs', 'ms', [100, 101, 200, 201, 102, 103]),
		]);
		expect(pooled.metadata).toEqual({ rounds: 3, visit: 'fresh' });
	});

	it('keeps null samples and an unmeasured metric', () => {
		const paint = (samples: (number | null)[]) =>
			summarizeNullableMetric('bannerPaintMs', 'ms', samples);
		const markup = summarizeNullableMetric('bannerMarkupMs', 'ms', []);
		const ready = summarizeNullableMetric('bannerReadyMs', 'ms', [null]);
		const pooled = poolRoundResults(
			[
				result([paint([null, 5]), markup, ready]),
				result([paint([7]), markup, ready]),
			],
			'baseline'
		);
		expect(pooled.metrics).toEqual([
			paint([null, 5, 7]),
			markup,
			summarizeNullableMetric('bannerReadyMs', 'ms', [null, null]),
		]);
	});

	it('keeps every round’s metadata observations', () => {
		const metric = summarizeMetric('fcpMs', 'ms', [1]);
		const round = (metadata: BenchmarkResult['metadata']) => ({
			...result([metric]),
			metadata,
		});
		const pooled = poolRoundResults(
			[
				round({ bannerPaintMs: 290, consoleErrors: [], iterations: 10 }),
				round({ bannerPaintMs: 310, consoleErrors: ['a'], iterations: 10 }),
				round({ bannerPaintMs: null, consoleErrors: ['b'], iterations: 10 }),
			],
			'baseline'
		);
		expect(pooled.metadata).toEqual({
			bannerPaintMs: [290, 310, null],
			consoleErrors: ['a', 'b'],
			iterations: 10,
			rounds: 3,
		});
	});

	it('rejects rounds that measured different metrics', () => {
		expect(() =>
			poolRoundResults(
				[
					result([summarizeMetric('bannerReadyMs', 'ms', [1])]),
					result([summarizeMetric('fcpMs', 'ms', [1])]),
				],
				'baseline.json'
			)
		).toThrow('baseline.json: a round is missing bannerReadyMs.');
	});
});

describe('poolRoundDirectories', () => {
	it('fails when a round is missing a result', () => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-rounds-'));
		try {
			const metric = summarizeMetric('fcpMs', 'ms', [1]);
			writeJson(join(root, '0/react/a.json'), result([metric]));
			writeJson(join(root, '0/react/b.json'), result([metric]));
			writeJson(join(root, '1/react/a.json'), result([metric]));
			expect(() =>
				poolRoundDirectories(
					[join(root, '0'), join(root, '1')],
					join(root, 'out')
				)
			).toThrow('round 2 produced different result files');

			writeJson(join(root, '1/react/b.json'), result([metric]));
			poolRoundDirectories(
				[join(root, '0'), join(root, '1')],
				join(root, 'out')
			);
			expect(
				readJson<BenchmarkResult>(join(root, 'out/react/b.json')).metrics[0]
					?.samples
			).toEqual([1, 1]);
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	});
});
