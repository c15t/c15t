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
						id: 'sub_123',
						consents: {},
					}),
					{
						status: 201,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await createSubject(context, {
				type: 'new',
				subjectId: 'sub_123',
				consents: {},
			});

			expect(result.ok).toBe(true);
			expect(result.data?.id).toBe('sub_123');

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/subjects');
			expect(fetchCall[1].method).toBe('POST');
		});

		it('should handle validation errors', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Invalid input' }), {
					status: 400,
					headers: { 'content-type': 'application/json' },
				})
			);
			globalThis.fetch = mockFetch;

			const result = await createSubject(context, {
				type: 'new',
				subjectId: '',
				consents: {},
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
						id: 'sub_123',
						consents: [],
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await getSubject(context, 'sub_123');

			expect(result.ok).toBe(true);
			expect(result.data?.id).toBe('sub_123');

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('/subjects/sub_123');
			expect(fetchCall[1].method).toBe('GET');
		});

		it('should handle not found error', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'Subject not found' }), {
					status: 404,
					headers: { 'content-type': 'application/json' },
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
						id: 'sub_123',
						externalId: 'user_456',
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await patchSubject(context, 'sub_123', {
				externalId: 'user_456',
			});

			expect(result.ok).toBe(true);

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
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			const result = await listSubjects(context);

			expect(result.ok).toBe(true);
			expect(result.data?.subjects).toHaveLength(2);

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
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				)
			);
			globalThis.fetch = mockFetch;

			await listSubjects(context, {
				externalId: 'user_123',
				limit: 10,
				offset: 0,
			});

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('externalId=user_123');
			expect(fetchCall[0]).toContain('limit=10');
			expect(fetchCall[0]).toContain('offset=0');
		});
	});
});
