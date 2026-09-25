/**
 * Metric summaries shared by the browser benches for page paint, banner
 * milestones, and server HTML streaming. Each milestone keeps its own name
 * so no metric stands in for another.
 */
import type { ServerHtmlStreamAnalysis } from './html-stream';
import type { MetricSampleSet } from './schema';
import { summarizeMetric, summarizeNullableMetric } from './utils';

/** What each shared milestone metric means, written into result notes. */
export const visitMetricGlossary = [
	'bannerDomMs: banner root first present in the DOM, styled or not.',
	'bannerFirstFrameMs: first animation frame after the banner entered the DOM; the earliest frame that could paint it, not a paint timestamp.',
	'bannerPaintMs: Element Timing paint of banner text or images; null when Chromium emitted no entry.',
	'bannerReadyMs: hydrated readiness, recorded by the app probe once the consent runtime reports an active banner and the accept button is visible.',
	'fcpMs / lcpMs: page First Contentful Paint and Largest Contentful Paint, independent of the banner.',
	'bannerInFirstChunk / bannerInServerHtml: banner markup in the first streamed body chunk versus anywhere in the server HTML, from a separate raw HTTP read with the same cookies.',
] as const;

export interface VisitTimingSample {
	bannerDomMs?: number | null;
	bannerFirstFrameMs?: number | null;
	fcpMs?: number | null;
	lcpMs?: number | null;
}

/**
 * Summaries for the page-paint and pre-hydration banner milestones. Missing
 * values stay null rather than becoming zero, so a visit without a banner
 * does not report a zero-millisecond banner.
 *
 * @param samples - Per-visit observer readings.
 * @returns Metric sample sets in a stable order.
 */
export const summarizeVisitTimingMetrics = function summarizeVisitTimingMetrics(
	samples: readonly VisitTimingSample[]
): MetricSampleSet[] {
	return [
		summarizeNullableMetric(
			'bannerDomMs',
			'ms',
			samples.map((sample) => sample.bannerDomMs ?? null)
		),
		summarizeNullableMetric(
			'bannerFirstFrameMs',
			'ms',
			samples.map((sample) => sample.bannerFirstFrameMs ?? null)
		),
		summarizeNullableMetric(
			'fcpMs',
			'ms',
			samples.map((sample) => sample.fcpMs ?? null)
		),
		summarizeNullableMetric(
			'lcpMs',
			'ms',
			samples.map((sample) => sample.lcpMs ?? null)
		),
	];
};

/**
 * Summaries for raw server HTML reads of one scenario.
 *
 * @param reads - One analysis per raw HTTP read.
 * @returns Metric sample sets, or an empty list when nothing was read.
 */
export const summarizeServerHtmlMetrics = function summarizeServerHtmlMetrics(
	reads: readonly ServerHtmlStreamAnalysis[]
): MetricSampleSet[] {
	if (reads.length === 0) {
		return [];
	}
	return [
		summarizeMetric(
			'bannerInFirstChunk',
			'count',
			reads.map((read) => (read.bannerInFirstChunk ? 1 : 0))
		),
		summarizeMetric(
			'bannerInServerHtml',
			'count',
			reads.map((read) => (read.bannerInServerHtml ? 1 : 0))
		),
		summarizeNullableMetric(
			'bannerMarkupMs',
			'ms',
			reads.map((read) => read.bannerMarkupMs)
		),
		summarizeNullableMetric(
			'serverFirstChunkMs',
			'ms',
			reads.map((read) => read.firstChunkMs)
		),
		summarizeMetric(
			'serverFirstChunkBytes',
			'bytes',
			reads.map((read) => read.firstChunkBytes)
		),
		summarizeMetric(
			'serverHtmlChunkCount',
			'count',
			reads.map((read) => read.chunkCount)
		),
	];
};

/**
 * Metadata booleans for a scenario's server HTML reads. `null` means the
 * harness did not read server HTML for the scenario.
 */
export const serverHtmlMetadata = function serverHtmlMetadata(
	reads: readonly ServerHtmlStreamAnalysis[]
): { bannerInFirstChunk: boolean | null; bannerInServerHtml: boolean | null } {
	if (reads.length === 0) {
		return { bannerInFirstChunk: null, bannerInServerHtml: null };
	}
	return {
		bannerInFirstChunk: reads.every((read) => read.bannerInFirstChunk),
		bannerInServerHtml: reads.every((read) => read.bannerInServerHtml),
	};
};
