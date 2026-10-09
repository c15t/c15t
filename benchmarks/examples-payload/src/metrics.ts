/**
 * Turns what the browser loaded for one example into the gate's metrics.
 * Everything here is pure, so it can be tested without a browser.
 */
import { brotliCompressSync, gzipSync } from 'node:zlib';

import {
	EXAMPLES_PAYLOAD_BOUNDARY_METRICS,
	EXAMPLES_PAYLOAD_PACKAGE,
	examplesPayloadBudgetsFor,
} from '@c15t/benchmarking/examples-payload';
import type {
	ExampleKind,
	ExamplesPayloadBoundaryMetric,
} from '@c15t/benchmarking/examples-payload';
import type {
	BenchmarkEnvironment,
	BenchmarkFramework,
	BenchmarkResult,
	MetricSampleSet,
} from '@c15t/benchmarking/schema';

export type Phase = 'initial' | 'dialog' | 'accept';

export interface Sizes {
	raw: number;
	gzip: number;
	brotli: number;
}

export interface CollectedAsset extends Sizes {
	url: string;
	phase: Phase;
	type: 'js' | 'css';
	boundaries: ExamplesPayloadBoundaryMetric[];
}

export interface CollectedRequest {
	url: string;
	method: string;
	phase: Phase;
	/** Origin differs from the page's, as the browser saw the URL. */
	crossOrigin: boolean;
}

export interface InteractionOutcome {
	measured: boolean;
	reason?: string;
}

export interface ExampleMeasurement {
	example: string;
	kind: ExampleKind;
	framework: BenchmarkFramework;
	url: string;
	document: (Sizes & { boundaries: ExamplesPayloadBoundaryMetric[] }) | null;
	/** Initial and dialog assets from the first visit, accept assets from the second. */
	assets: CollectedAsset[];
	/** Requests from the first visit's initial phase. */
	requests: CollectedRequest[];
	bannerVisible: boolean;
	dialog: InteractionOutcome;
	accept: InteractionOutcome & { saved?: boolean };
	bannerVisibleMs: number[];
	emittedClientJsGzip: number | null;
	/** Fixture backend requests made while the example built. */
	buildBackendRequests: Record<string, number>;
	notes: string[];
}

/** Compressed sizes with Node zlib defaults, as the other payload benches use. */
export const sizesOf = function sizesOf(bytes: Uint8Array): Sizes {
	return {
		brotli: brotliCompressSync(bytes).byteLength,
		gzip: gzipSync(bytes).byteLength,
		raw: bytes.byteLength,
	};
};

const pathnameOf = function pathnameOf(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
};

/** A consent `/init` request, to the backend or a same-origin proxy. */
export const isInitRequest = function isInitRequest(url: string): boolean {
	return pathnameOf(url).replace(/\/+$/u, '').endsWith('/init');
};

/** A consent manifest request. A web app manifest is `manifest.json`. */
export const isManifestRequest = function isManifestRequest(
	url: string
): boolean {
	return pathnameOf(url).replace(/\/+$/u, '').endsWith('/manifest');
};

export const median = function median(values: number[]): number | null {
	if (values.length === 0) {
		return null;
	}
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
		: (sorted[middle] as number);
};

const sum = function sum(values: number[]): number {
	return values.reduce((total, value) => total + value, 0);
};

/**
 * Metric values for one example. `null` means the phase couldn't be
 * measured, which is different from zero bytes.
 */
export const summarize = function summarize(
	measurement: ExampleMeasurement
): Record<string, number | null> {
	const of = (phase: Phase, type: CollectedAsset['type']) =>
		measurement.assets.filter(
			(asset) => asset.phase === phase && asset.type === type
		);
	const initialJs = of('initial', 'js');
	const metrics: Record<string, number | null> = {
		acceptJsGzip: measurement.accept.measured
			? sum(of('accept', 'js').map((asset) => asset.gzip))
			: null,
		bannerVisibleMs: median(measurement.bannerVisibleMs),
		crossOriginRequests: measurement.requests.filter(
			(request) => request.crossOrigin
		).length,
		dialogJsGzip: measurement.dialog.measured
			? sum(of('dialog', 'js').map((asset) => asset.gzip))
			: null,
		documentGzip: measurement.document?.gzip ?? null,
		emittedClientJsGzip: measurement.emittedClientJsGzip,
		initRequests: measurement.requests.filter((request) =>
			isInitRequest(request.url)
		).length,
		initialCssGzip: sum(of('initial', 'css').map((asset) => asset.gzip)),
		initialJsBrotli: sum(initialJs.map((asset) => asset.brotli)),
		initialJsGzip: sum(initialJs.map((asset) => asset.gzip)),
		initialJsRaw: sum(initialJs.map((asset) => asset.raw)),
		initialJsRequests: initialJs.length,
		manifestRequests: measurement.requests.filter((request) =>
			isManifestRequest(request.url)
		).length,
	};
	for (const boundary of EXAMPLES_PAYLOAD_BOUNDARY_METRICS) {
		metrics[boundary] = sum(
			initialJs
				.filter((asset) => asset.boundaries.includes(boundary))
				.map((asset) => asset.gzip)
		);
	}
	return metrics;
};

const UNITS: Record<string, MetricSampleSet['unit']> = {
	bannerVisibleMs: 'ms',
	crossOriginRequests: 'count',
	initRequests: 'count',
	initialJsRequests: 'count',
	manifestRequests: 'count',
};

const sampleSet = function sampleSet(
	name: string,
	samples: number[]
): MetricSampleSet {
	const sorted = [...samples].sort((a, b) => a - b);
	const p95Index = Math.min(
		sorted.length - 1,
		Math.ceil(sorted.length * 0.95) - 1
	);
	return {
		avg: sum(sorted) / sorted.length,
		median: median(sorted) as number,
		name,
		p95: sorted[Math.max(0, p95Index)] as number,
		samples: sorted,
		unit: UNITS[name] ?? 'bytes',
	};
};

export interface ResultContext {
	commitSha: string;
	environment: BenchmarkEnvironment;
	timestamp: string;
	backendLatencyMs: number;
}

/**
 * The comparison gate's result for one example. Metrics that couldn't be
 * measured are left out and explained in `notes`, so a budget on them
 * fails as a missing metric instead of passing on zero.
 */
export const toBenchmarkResult = function toBenchmarkResult(
	measurement: ExampleMeasurement,
	context: ResultContext
): BenchmarkResult {
	const values = summarize(measurement);
	const metrics: MetricSampleSet[] = [];
	const notes = [...measurement.notes];
	for (const [name, value] of Object.entries(values)) {
		if (value === null) {
			notes.push(`${name} not measured`);
			continue;
		}
		metrics.push(
			name === 'bannerVisibleMs'
				? sampleSet(name, measurement.bannerVisibleMs)
				: sampleSet(name, [value])
		);
	}
	return {
		budgetDefinitions: examplesPayloadBudgetsFor(measurement.kind),
		budgets: [],
		commitSha: context.commitSha,
		environment: context.environment,
		fixture: {
			consentCount: 5,
			localeCount: 1,
			name: 'optin-choice-eu',
			notes: [
				'Fixture backend serves buildBrowserBenchManifest() and its DE resolution.',
			],
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: measurement.framework,
		metadata: {
			backendLatencyMs: context.backendLatencyMs,
			bannerVisible: measurement.bannerVisible,
			kind: measurement.kind,
			url: measurement.url,
		},
		metrics: metrics.sort((a, b) => a.name.localeCompare(b.name)),
		notes,
		package: EXAMPLES_PAYLOAD_PACKAGE,
		runtime: 'chromium',
		scenario: measurement.example,
		schemaVersion: 1,
		suite: 'examples-payload',
		timestamp: context.timestamp,
	};
};
