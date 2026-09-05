import type {
	BenchmarkComparisonResult,
	BenchmarkResult,
	MetricBudget,
	MetricBudgetResult,
	MetricSampleSet,
} from './schema';

/**
 * Comparators that need a base metric. A missing base metric is a failed
 * budget for these: comparing against an implicit zero is how a gate
 * passes without measuring anything.
 */
const RELATIVE_COMPARATORS = new Set<MetricBudget['comparator']>([
	'delta-bytes-lte',
	'percent-lte',
	'absolute-and-percent-lte',
]);

export const budgetNeedsBase = function budgetNeedsBase(
	budget: Pick<MetricBudget, 'comparator'>
): boolean {
	return RELATIVE_COMPARATORS.has(budget.comparator);
};

const failedBudget = function failedBudget(
	budget: MetricBudget,
	message: string,
	status: NonNullable<MetricBudgetResult['status']>
): MetricBudgetResult {
	return {
		actual: null,
		baseArm: budget.baseArm,
		comparator: budget.comparator,
		message,
		metric: budget.metric,
		pass: false,
		secondaryThreshold: budget.secondaryThreshold,
		status,
		threshold: budget.threshold,
	};
};

/**
 * Percent change of head over base. `null` when base is zero and head is
 * not: the change is unbounded, and the caller must not treat it as 0%.
 */
const percentChange = function percentChange(
	headMedian: number,
	baseMedian: number
): number | null {
	if (baseMedian === 0) {
		return headMedian === 0 ? 0 : null;
	}
	return Number((((headMedian - baseMedian) / baseMedian) * 100).toFixed(3));
};

interface BudgetContext {
	budget: MetricBudget;
	headMedian: number;
	baseMedian: number;
	delta: number;
	deltaPercent: number | null;
}

const budgetResult = function budgetResult(
	context: BudgetContext,
	pass: boolean,
	actual: number | null,
	message: string
): MetricBudgetResult {
	return {
		actual,
		baseArm: context.budget.baseArm,
		comparator: context.budget.comparator,
		message,
		metric: context.budget.metric,
		pass,
		secondaryThreshold: context.budget.secondaryThreshold,
		status: 'evaluated',
		threshold: context.budget.threshold,
	};
};

const evaluateDeltaBytes = function evaluateDeltaBytes(
	context: BudgetContext
): MetricBudgetResult {
	const { budget, delta } = context;
	const pass = delta <= budget.threshold;
	return budgetResult(
		context,
		pass,
		delta,
		pass
			? `${budget.metric} increased by ${delta.toFixed(2)} bytes`
			: `${budget.metric} exceeded byte budget by ${(delta - budget.threshold).toFixed(2)} bytes`
	);
};

const evaluatePercent = function evaluatePercent(
	context: BudgetContext
): MetricBudgetResult {
	const { budget, deltaPercent, headMedian } = context;
	if (deltaPercent === null) {
		return budgetResult(
			context,
			false,
			null,
			`${budget.metric} regressed from a base median of 0 to ${headMedian}`
		);
	}
	const pass = deltaPercent <= budget.threshold;
	return budgetResult(
		context,
		pass,
		deltaPercent,
		pass
			? `${budget.metric} changed by ${deltaPercent.toFixed(2)}%`
			: `${budget.metric} regressed by ${deltaPercent.toFixed(2)}%`
	);
};

const evaluateAbsoluteAndPercent = function evaluateAbsoluteAndPercent(
	context: BudgetContext
): MetricBudgetResult {
	const { budget, delta, deltaPercent } = context;
	const percentLimit = budget.secondaryThreshold ?? Number.POSITIVE_INFINITY;
	let percentPass = false;
	if (deltaPercent === null) {
		percentPass = delta <= 0 || percentLimit === Number.POSITIVE_INFINITY;
	} else {
		percentPass = deltaPercent <= percentLimit;
	}
	const pass = delta <= budget.threshold && percentPass;
	const percentLabel =
		deltaPercent === null ? 'n/a%' : `${deltaPercent.toFixed(2)}%`;
	return budgetResult(
		context,
		pass,
		delta,
		pass
			? `${budget.metric} changed by ${delta.toFixed(2)} (${percentLabel})`
			: `${budget.metric} regressed by ${delta.toFixed(2)} (${percentLabel})`
	);
};

const evaluateAbsolute = function evaluateAbsolute(
	context: BudgetContext
): MetricBudgetResult {
	const { budget, headMedian } = context;
	const pass = headMedian <= budget.threshold;
	return budgetResult(
		context,
		pass,
		headMedian,
		pass
			? `${budget.metric} is ${headMedian} (allowance ${budget.threshold})`
			: `${budget.metric} is ${headMedian}, above the allowance of ${budget.threshold}`
	);
};

const evaluateEquality = function evaluateEquality(
	context: BudgetContext
): MetricBudgetResult {
	const { budget, headMedian } = context;
	const pass = headMedian === budget.threshold;
	return budgetResult(
		context,
		pass,
		headMedian,
		pass
			? `${budget.metric} matched expected value ${budget.threshold}`
			: `${budget.metric} expected ${budget.threshold} but saw ${headMedian}`
	);
};

const COMPARATORS: Record<
	MetricBudget['comparator'],
	(context: BudgetContext) => MetricBudgetResult
> = {
	'absolute-and-percent-lte': evaluateAbsoluteAndPercent,
	'absolute-lte': evaluateAbsolute,
	'count-eq': evaluateEquality,
	'delta-bytes-lte': evaluateDeltaBytes,
	'percent-lte': evaluatePercent,
	'truthy-eq': evaluateEquality,
};

export const evaluateBudget = function evaluateBudget(
	budget: MetricBudget,
	headMetric: MetricSampleSet | undefined,
	baseMetric?: MetricSampleSet
): MetricBudgetResult {
	if (!headMetric) {
		return failedBudget(
			budget,
			`Missing head metric "${budget.metric}"`,
			'missing-head-metric'
		);
	}

	const headMedian = headMetric.median as number | null;
	if (headMedian === null) {
		return failedBudget(
			budget,
			`Metric "${budget.metric}" has no supported samples`,
			'missing-head-metric'
		);
	}

	const baseMedianRaw = baseMetric?.median as number | null | undefined;
	const hasBase = typeof baseMedianRaw === 'number';
	if (budgetNeedsBase(budget) && !hasBase) {
		return failedBudget(
			budget,
			`Missing base metric "${budget.metric}"${budget.baseArm ? ` in ${budget.baseArm} arm` : ''}`,
			'missing-base-metric'
		);
	}

	const baseMedian = hasBase ? baseMedianRaw : 0;
	return COMPARATORS[budget.comparator]({
		baseMedian,
		budget,
		delta: headMedian - baseMedian,
		deltaPercent: percentChange(headMedian, baseMedian),
		headMedian,
	});
};

const formatCell = function formatCell(value: number | null | undefined) {
	return value === null || value === undefined ? 'n/a' : `${value}`;
};

const summaryLines = function summaryLines(
	comparison: BenchmarkComparisonResult
): string[] {
	const { summary } = comparison;
	if (!summary) {
		return [];
	}
	const lines = ['## Summary', ''];
	lines.push(
		`- Enforcement: ${summary.enforce ? 'on' : 'off'} | Result: ${summary.ok ? 'pass' : 'fail'}`
	);
	lines.push(
		`- Results: ${summary.results.compared}/${summary.results.expected} expected results compared; missing head ${summary.results.missingHead.length}; missing base ${summary.results.missingBase.length}; unexpected ${summary.results.unexpected.length}`
	);
	lines.push(
		`- Budgets: ${summary.budgets.passed} passed, ${summary.budgets.failed} failed, ${summary.budgets.missingHeadMetric} missing head metric, ${summary.budgets.missingBaseMetric} missing base metric, ${summary.budgets.unevaluatedArm} unevaluated (arm) of ${summary.budgets.expected} expected`
	);
	if (summary.allowedUnevaluatedArms.length > 0) {
		lines.push(
			`- Explicitly allowed unevaluated arms: ${summary.allowedUnevaluatedArms.join(', ')}`
		);
	}
	for (const failure of summary.failures) {
		lines.push(`- FAIL: ${failure}`);
	}
	lines.push('');
	return lines;
};

const budgetRow = function budgetRow(budget: MetricBudgetResult): string {
	const arm = budget.baseArm ? ` (vs ${budget.baseArm})` : '';
	return `| ${budget.metric}${arm} | ${budget.status ?? 'evaluated'} | ${budget.pass ? 'yes' : 'no'} | ${budget.message} |`;
};

export const toMarkdownComparison = function toMarkdownComparison(
	comparison: BenchmarkComparisonResult
): string {
	const lines = [
		'# Benchmark Regression Report',
		'',
		`Generated at: ${comparison.generatedAt}`,
		'',
	];

	if (comparison.baseSha || comparison.headSha) {
		lines.push(
			`Base: ${comparison.baseSha ?? 'unknown'} | Head: ${comparison.headSha ?? 'unknown'}`,
			''
		);
	}

	lines.push(...summaryLines(comparison));

	for (const result of comparison.results) {
		lines.push(`## ${result.package} :: ${result.scenario}`);
		if (result.baseKey) {
			lines.push('');
			lines.push(`Base: ${result.baseKey}`);
		}
		if (result.status === 'missing-base') {
			lines.push('');
			lines.push('Base result missing: no regression comparison possible.');
		}
		lines.push('');
		lines.push('| Metric | Base Median | Head Median | Delta | Delta % |');
		lines.push('| --- | ---: | ---: | ---: | ---: |');

		for (const metric of result.metrics) {
			lines.push(
				`| ${metric.name} | ${formatCell(metric.baseMedian)} | ${metric.headMedian} | ${formatCell(metric.delta)} | ${formatCell(metric.deltaPercent)} |`
			);
		}

		if (result.budgets.length > 0) {
			lines.push('');
			lines.push('| Budget | Status | Pass | Message |');
			lines.push('| --- | --- | --- | --- |');
			for (const budget of result.budgets) {
				lines.push(budgetRow(budget));
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
};

export const indexMetrics = function indexMetrics(
	result: BenchmarkResult
): Map<string, MetricSampleSet> {
	return new Map(result.metrics.map((metric) => [metric.name, metric]));
};

/**
 * Whether any evaluated budget failed. Budgets that could not be
 * evaluated (missing metrics, missing arm artifacts) are reported
 * through the comparison summary instead, so a caller cannot mistake
 * "not measured" for "passed".
 */
export const hasFailingBudgets = function hasFailingBudgets(
	comparison: BenchmarkComparisonResult
): boolean {
	return comparison.results.some((result) =>
		result.budgets.some(
			(budget) => !budget.pass && (budget.status ?? 'evaluated') === 'evaluated'
		)
	);
};
