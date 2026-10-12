import { describe, expect, it } from 'vitest';

import {
	isInitRequest,
	isManifestRequest,
	summarize,
	toBenchmarkResult,
} from './metrics';
import type { CollectedAsset, ExampleMeasurement } from './metrics';

const asset = function asset(
	overrides: Partial<CollectedAsset> & Pick<CollectedAsset, 'url'>
): CollectedAsset {
	return {
		boundaries: [],
		brotli: 80,
		gzip: 100,
		phase: 'initial',
		raw: 300,
		type: 'js',
		...overrides,
	};
};

const measurement = function measurement(
	overrides: Partial<ExampleMeasurement> = {}
): ExampleMeasurement {
	return {
		accept: { measured: true, saved: true },
		assets: [
			asset({ boundaries: ['snapshotBytes'], url: '/a.js' }),
			asset({
				boundaries: ['snapshotBytes', 'resolverBytes'],
				gzip: 50,
				url: '/b.js',
			}),
			asset({ gzip: 40, type: 'css', url: '/a.css' }),
			asset({ gzip: 30, phase: 'dialog', url: '/dialog.js' }),
			asset({ gzip: 20, phase: 'accept', url: '/accept.js' }),
		],
		bannerVisible: true,
		bannerVisibleMs: [30, 10, 20],
		buildBackendRequests: {},
		dialog: { measured: true },
		document: { boundaries: [], brotli: 9, gzip: 10, raw: 20 },
		emittedClientJsGzip: 1000,
		example: 'nextjs',
		framework: 'nextjs',
		kind: 'server',
		notes: [],
		requests: [
			{
				crossOrigin: false,
				method: 'GET',
				phase: 'initial',
				url: 'http://127.0.0.1:3100/api/c15t/init?x=1',
			},
			{
				crossOrigin: true,
				method: 'GET',
				phase: 'initial',
				url: 'https://your-project.inth.app/manifest',
			},
			{
				crossOrigin: false,
				method: 'GET',
				phase: 'initial',
				url: 'http://127.0.0.1:3100/manifest.json',
			},
		],
		url: 'http://127.0.0.1:3100/',
		...overrides,
	};
};

describe('request classification', () => {
	it.each([
		['http://x/init', true],
		['http://x/api/c15t/init/', true],
		['http://x/initial.js', false],
	])('isInitRequest(%s) is %s', (url, expected) => {
		expect(isInitRequest(url)).toBe(expected);
	});

	it.each([
		['http://x/manifest', true],
		['http://x/api/c15t/manifest?v=2', true],
		['http://x/manifest.json', false],
		['http://x/site.webmanifest', false],
	])('isManifestRequest(%s) is %s', (url, expected) => {
		expect(isManifestRequest(url)).toBe(expected);
	});
});

describe('summarize', () => {
	it('sums first-load JS per phase and attributes whole assets to boundaries', () => {
		expect(summarize(measurement())).toMatchObject({
			acceptJsGzip: 20,
			bannerVisibleMs: 20,
			crossOriginRequests: 1,
			dialogJsGzip: 30,
			documentGzip: 10,
			initRequests: 1,
			initialCssGzip: 40,
			initialJsBrotli: 160,
			initialJsGzip: 150,
			initialJsRaw: 600,
			initialJsRequests: 2,
			manifestRequests: 1,
			offlinePolicyBytes: 0,
			resolverBytes: 50,
			snapshotBytes: 150,
		});
	});

	it('reports an interaction it could not run as unmeasured, not zero', () => {
		const values = summarize(
			measurement({
				accept: { measured: false, reason: 'no visible button' },
				dialog: { measured: false, reason: 'banner not visible' },
			})
		);
		expect(values.dialogJsGzip).toBeNull();
		expect(values.acceptJsGzip).toBeNull();
	});
});

describe('toBenchmarkResult', () => {
	const context = {
		backendLatencyMs: 0,
		commitSha: 'abc',
		environment: { arch: 'arm64', ci: false, os: 'darwin' },
		timestamp: '2026-10-09T00:00:00.000Z',
	};

	it('keys the result by package, example and suite with its budgets', () => {
		const result = toBenchmarkResult(measurement(), context);
		expect(result).toMatchObject({
			package: '@c15t/examples-payload-bench',
			scenario: 'nextjs',
			suite: 'examples-payload',
		});
		expect(result.budgetDefinitions?.map((budget) => budget.metric)).toContain(
			'resolverBytes'
		);
		expect(
			result.metrics.find((metric) => metric.name === 'bannerVisibleMs')
		).toMatchObject({ median: 20, samples: [10, 20, 30], unit: 'ms' });
	});

	it('leaves unmeasured metrics out so their budgets cannot pass on zero', () => {
		const result = toBenchmarkResult(
			measurement({ dialog: { measured: false, reason: 'no dialog' } }),
			context
		);
		expect(result.metrics.map((metric) => metric.name)).not.toContain(
			'dialogJsGzip'
		);
		expect(result.notes).toContain('dialogJsGzip not measured');
	});
});
