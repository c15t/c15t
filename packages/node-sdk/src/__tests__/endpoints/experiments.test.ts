import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_PATH,
	summarizeExperiment,
} from '../../endpoints/experiments';
import type { FetcherContext } from '../../fetcher';

describe('Experiments Endpoints', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	const context: FetcherContext = {
		baseUrl: 'https://api.example.com',
		debug: false,
		headers: {},
		retryConfig: {},
		timeout: 5000,
	};

	it('should have correct path', () => {
		expect(EXPERIMENTS_PATH).toBe('/experiments');
	});

	describe('summarizeExperiment', () => {
		it('should GET the summary with the id in the path and filters as query', async () => {
			const summary = {
				experimentId: 'banner-shape',
				from: '2026-09-01T00:00:00.000Z',
				to: null,
				variants: [
					{
						byAction: { all: 3 },
						bySurface: { banner: 3 },
						choices: 3,
						medianTimeToDecisionMs: 4200,
						variant: 'bar',
					},
				],
			};
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify(summary), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
			globalThis.fetch = mockFetch;

			const result = await summarizeExperiment(context, 'banner-shape', {
				domain: 'example.com',
				from: '2026-09-01',
			});

			expect(result.ok).toBe(true);
			expect(result.data).toEqual(summary);

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const fetchCall = mockFetch.mock.calls[0];
			expect.assert(fetchCall, 'Expected a fetch call');
			expect(fetchCall[0]).toContain('/experiments/banner-shape/summary');
			expect(fetchCall[0]).toContain('domain=example.com');
			expect(fetchCall[0]).toContain('from=2026-09-01');
			expect(fetchCall[1].method).toBe('GET');
		});

		it('should escape the experiment id', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ variants: [] }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
			globalThis.fetch = mockFetch;

			await summarizeExperiment(context, 'a/b test');

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const fetchCall = mockFetch.mock.calls[0];
			expect.assert(fetchCall, 'Expected a fetch call');
			expect(fetchCall[0]).toContain('/experiments/a%2Fb%20test/summary');
		});
	});
});
