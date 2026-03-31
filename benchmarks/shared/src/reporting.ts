import type {
	BenchmarkComparisonResult,
	BenchmarkResult,
	MetricBudget,
	MetricBudgetResult,
	MetricSampleSet,
} from './schema';

export function evaluateBudget(
	budget: MetricBudget,
	headMetric: MetricSampleSet | undefined,
	baseMetric?: MetricSampleSet
): MetricBudgetResult {
	if (!headMetric) {
		return {
			metric: budget.metric,
			pass: false,
			comparator: budget.comparator,
			actual: null,
			threshold: budget.threshold,
			secondaryThreshold: budget.secondaryThreshold,
			message: `Missing metric "${budget.metric}"`,
		};
	}

	const headMedian = headMetric.median;
	const baseMedian = baseMetric?.median ?? 0;
	const delta = headMedian - baseMedian;
	const deltaPercent =
		baseMedian > 0
			? Number((((headMedian - baseMedian) / baseMedian) * 100).toFixed(3))
			: null;

	switch (budget.comparator) {
		case 'delta-bytes-lte': {
			const pass = delta <= budget.threshold;
			return {
				metric: budget.metric,
				pass,
				comparator: budget.comparator,
				actual: delta,
				threshold: budget.threshold,
				message: pass
					? `${budget.metric} increased by ${delta.toFixed(2)} bytes`
					: `${budget.metric} exceeded byte budget by ${(delta - budget.threshold).toFixed(2)} bytes`,
			};
		}
		case 'percent-lte': {
			const actual = deltaPercent ?? 0;
			const pass = actual <= budget.threshold;
			return {
				metric: budget.metric,
				pass,
				comparator: budget.comparator,
				actual,
				threshold: budget.threshold,
				message: pass
					? `${budget.metric} changed by ${actual.toFixed(2)}%`
					: `${budget.metric} regressed by ${actual.toFixed(2)}%`,
			};
		}
		case 'absolute-and-percent-lte': {
			const actualPercent = deltaPercent ?? 0;
			const pass =
				delta <= budget.threshold &&
				actualPercent <=
					(budget.secondaryThreshold ?? Number.POSITIVE_INFINITY);
			return {
				metric: budget.metric,
				pass,
				comparator: budget.comparator,
				actual: delta,
				threshold: budget.threshold,
				secondaryThreshold: budget.secondaryThreshold,
				message: pass
					? `${budget.metric} changed by ${delta.toFixed(2)} (${actualPercent.toFixed(2)}%)`
					: `${budget.metric} regressed by ${delta.toFixed(2)} (${actualPercent.toFixed(2)}%)`,
			};
		}
		case 'count-eq':
		case 'truthy-eq': {
			const actual = headMedian;
			const pass = actual === budget.threshold;
			return {
				metric: budget.metric,
				pass,
				comparator: budget.comparator,
				actual,
				threshold: budget.threshold,
				message: pass
					? `${budget.metric} matched expected value ${budget.threshold}`
					: `${budget.metric} expected ${budget.threshold} but saw ${actual}`,
			};
		}
	}
}

export function toMarkdownComparison(
	comparison: BenchmarkComparisonResult
): string {
	const lines = [
		'# Benchmark Regression Report',
		'',
		`Generated at: ${comparison.generatedAt}`,
		'',
	];

	for (const result of comparison.results) {
		lines.push(`## ${result.package} :: ${result.scenario}`);
		lines.push('');
		lines.push('| Metric | Base Median | Head Median | Delta | Delta % |');
		lines.push('| --- | ---: | ---: | ---: | ---: |');

		for (const metric of result.metrics) {
			lines.push(
				`| ${metric.name} | ${metric.baseMedian ?? 'n/a'} | ${metric.headMedian} | ${metric.delta ?? 'n/a'} | ${metric.deltaPercent ?? 'n/a'} |`
			);
		}

		if (result.budgets.length > 0) {
			lines.push('');
			lines.push('| Budget | Pass | Message |');
			lines.push('| --- | --- | --- |');
			for (const budget of result.budgets) {
				lines.push(
					`| ${budget.metric} | ${budget.pass ? 'yes' : 'no'} | ${budget.message} |`
				);
			}
		}

		if (result.notes.length > 0) {
			lines.push('');
			lines.push('Notes:');
			for (const note of result.notes) {
				lines.push(`- ${note}`);
			}
		}

		lines.push('');
	}

	return `${lines.join('\n')}\n`;
}

export function indexMetrics(
	result: BenchmarkResult
): Map<string, MetricSampleSet> {
	return new Map(result.metrics.map((metric) => [metric.name, metric]));
}

export function hasFailingBudgets(
	comparison: BenchmarkComparisonResult
): boolean {
	return comparison.results.some((result) =>
		result.budgets.some((budget) => !budget.pass)
	);
}
