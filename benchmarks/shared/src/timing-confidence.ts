import { evaluateBudget } from './reporting';
import type {
	MetricBudget,
	MetricBudgetResult,
	MetricSampleSet,
} from './schema';

/**
 * Distribution-free bounds on a median, using binomial order statistics.
 * Each one-sided bound has at most 0.5% error, so a head lower bound and
 * base upper bound together cover the median difference with at least 99%
 * confidence. No normal-distribution assumption or random seed is needed.
 */
const medianBounds = (samples: number[]): [number, number] | undefined => {
	if (
		samples.length < 8 ||
		samples.some((value) => !Number.isFinite(value) || value < 0)
	) {
		return undefined;
	}
	const sorted = [...samples].sort((left, right) => left - right);
	const count = sorted.length;
	// Scale binomial weights at the mode to avoid underflow for large samples.
	const weights = Array<number>(count + 1).fill(0);
	const middle = Math.floor(count / 2);
	weights[middle] = 1;
	for (let index = middle; index > 0; index -= 1) {
		weights[index - 1] = ((weights[index] ?? 0) * index) / (count - index + 1);
	}
	for (let index = middle; index < count; index += 1) {
		weights[index + 1] =
			((weights[index] ?? 0) * (count - index)) / (index + 1);
	}
	const tailLimit = weights.reduce((sum, weight) => sum + weight, 0) * 0.005;
	let tail = 0;
	let rank = 0;
	while (rank < middle && tail + (weights[rank] ?? 0) <= tailLimit) {
		tail += weights[rank] ?? 0;
		rank += 1;
	}
	if (rank === 0) {
		return undefined;
	}
	const lower = sorted[rank - 1];
	const upper = sorted[count - rank];
	return lower === undefined || upper === undefined
		? undefined
		: [lower, upper];
};

/**
 * Gate browser timing regressions only when the samples support exceeding
 * the existing limits at 99% confidence. Point estimates remain in reports.
 * Missing metrics, small/invalid sample sets and non-timing invariants keep
 * their strict evaluation.
 *
 * @param budget - Existing browser timing limit.
 * @param head - Head measurements, including raw visit samples.
 * @param base - Base measurements of the same metric.
 * @returns The observed change and whether its supported lower bound passes.
 */
export const evaluateBrowserTimingBudget = (
	budget: MetricBudget,
	head: MetricSampleSet | undefined,
	base: MetricSampleSet | undefined
): MetricBudgetResult => {
	const observed = evaluateBudget(budget, head, base);
	if (
		observed.pass ||
		observed.status !== 'evaluated' ||
		(base?.median === 0 && head?.median !== 0) ||
		head?.unit !== 'ms' ||
		base?.unit !== 'ms' ||
		![
			'percent-lte',
			'absolute-and-percent-lte',
			'absolute-or-percent-lte',
		].includes(budget.comparator)
	) {
		return observed;
	}
	const headBounds = medianBounds(head.samples);
	const baseBounds = medianBounds(base.samples);
	if (!headBounds || !baseBounds) {
		return observed;
	}
	const supported = evaluateBudget(
		budget,
		{ ...head, median: headBounds[0] },
		{ ...base, median: baseBounds[1] }
	);
	return {
		...observed,
		message: `${observed.message}; 99% lower bound on median growth ${(headBounds[0] - baseBounds[1]).toFixed(2)} ms${supported.pass ? ', not a confirmed budget breach' : ', confirmed budget breach'}`,
		pass: supported.pass,
	};
};
