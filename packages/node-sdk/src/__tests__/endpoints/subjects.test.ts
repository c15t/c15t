import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createSubject,
	getSubject,
	listSubjects,
	patchSubject,
	SUBJECTS_PATH,
} from '../../endpoints/subjects';
import type { FetcherContext } from '../../fetcher';

describe('Subjects Endpoints', () => {
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
		headers: {},
		retryConfig: {},
	};

	it('should have correct path', () => {
		expect(SUBJECTS_PATH).toBe('/subjects');
	});

	describe('createSubject', () => {
		it('should create a subject with POST method', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						consents: {},
						id: 'sub_123',
					}),
					{
						headers: { 'content-type': 'application/json' },
						status: 201,
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await createSubject(context, {
				consents: {},
				subjectId: 'sub_123',
				type: 'new',
			});

			expect(result.ok).toBe(true);
			expect(result.data?.id).toBe('sub_123');

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/subjects');
			expect(fetchCall[1].method).toBe('POST');
		});

		it('should handle validation errors', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Invalid input' }), {
					headers: { 'content-type': 'application/json' },
					status: 400,
				})
			);
			globalThis.fetch = mockFetch;

			const result = await createSubject(context, {
				consents: {},
				subjectId: '',
				type: 'new',
			});

			expect(result.ok).toBe(false);
			expect(result.error?.status).toBe(400);
		});
	});

	describe('getSubject', () => {
		it('should get a subject by ID', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						consents: [],
						id: 'sub_123',
					}),
					{
						headers: { 'content-type': 'application/json' },
						status: 200,
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await getSubject(context, 'sub_123');

			expect(result.ok).toBe(true);
			expect(result.data?.id).toBe('sub_123');

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/subjects/sub_123');
			expect(fetchCall[1].method).toBe('GET');
		});

		it('should handle not found error', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Subject not found' }), {
					headers: { 'content-type': 'application/json' },
					status: 404,
				})
			);
			globalThis.fetch = mockFetch;

			const result = await getSubject(context, 'nonexistent');

			expect(result.ok).toBe(false);
			expect(result.error?.status).toBe(404);
		});
	});

	describe('patchSubject', () => {
		it('should patch a subject with PATCH method', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						externalId: 'user_456',
						id: 'sub_123',
					}),
					{
						headers: { 'content-type': 'application/json' },
						status: 200,
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await patchSubject(context, 'sub_123', {
				externalId: 'user_456',
			});

			expect(result.ok).toBe(true);

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/subjects/sub_123');
			expect(fetchCall[1].method).toBe('PATCH');
		});
	});

	describe('listSubjects', () => {
		it('should list subjects with GET method', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						subjects: [{ id: 'sub_123' }, { id: 'sub_456' }],
						total: 2,
					}),
					{
						headers: { 'content-type': 'application/json' },
						status: 200,
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await listSubjects(context);

			expect(result.ok).toBe(true);
			expect(result.data?.subjects).toHaveLength(2);

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/subjects');
			expect(fetchCall[1].method).toBe('GET');
		});

		it('should pass query filters', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						subjects: [],
						total: 0,
					}),
					{
						headers: { 'content-type': 'application/json' },
						status: 200,
					}
				)
			);
			globalThis.fetch = mockFetch;

			await listSubjects(context, {
				externalId: 'user_123',
				limit: 10,
				offset: 0,
			});

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('externalId=user_123');
			expect(fetchCall[0]).toContain('limit=10');
			expect(fetchCall[0]).toContain('offset=0');
		});
	});
});
