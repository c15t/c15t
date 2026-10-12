import { describe, expect, it, vi } from 'vitest';

import { C15tError } from '../index';
import { createMockC15tClient, err, ok } from '../testing';
import { dataOf, errorOf } from './result-helpers';

describe('createMockC15tClient', () => {
	it('calls a handler with the method arguments', async () => {
		const get = vi.fn(() => err('NOT_FOUND'));
		const client = createMockC15tClient({ subjects: { get } });
		const { signal } = new AbortController();

		await client.subjects.get(
			'sub_abc',
			{ types: ['cookie_banner'] },
			{ signal }
		);

		expect(get).toHaveBeenCalledWith(
			'sub_abc',
			{ types: ['cookie_banner'] },
			{ signal }
		);
	});

	it('returns a promise for sync and async handlers alike', async () => {
		const client = createMockC15tClient({
			experiments: {
				summary: async (id) => {
					await Promise.resolve();
					return ok({ arms: [], experimentId: id, from: null, to: null });
				},
			},
			subjects: {
				identify: (id, { externalId }) =>
					ok({ subject: { externalId, id, identityProvider: 'external' } }),
			},
		});

		const identify = client.subjects.identify('sub_abc', {
			externalId: 'user_1',
		});
		const summary = client.experiments.summary('exp_1');

		expect(identify).toBeInstanceOf(Promise);
		expect(await identify).toMatchObject({
			data: { subject: { externalId: 'user_1', id: 'sub_abc' } },
			ok: true,
		});
		expect(await summary).toMatchObject({
			data: { experimentId: 'exp_1' },
			ok: true,
		});
	});

	it('returns err results as C15tErrors with their fields', async () => {
		const client = createMockC15tClient({
			subjects: {
				create: () =>
					err('STALE_POLICY', {
						reason: 'policy-changed',
						status: 422,
					}),
			},
		});

		const result = await client.subjects.create({
			domain: 'example.com',
			givenAt: 0,
			preferences: {},
			subjectId: 'sub_abc',
			type: 'cookie_banner',
		});

		const error = errorOf(result);
		expect(error).toBeInstanceOf(C15tError);
		expect(error).toMatchObject({
			code: 'STALE_POLICY',
			message: 'Mock STALE_POLICY error.',
			reason: 'policy-changed',
			requestId: 'mock-request-id',
			retryable: false,
			status: 422,
		});
	});

	it('rejects a call to a method without a handler, naming it', async () => {
		const client = createMockC15tClient();

		await expect(
			client.legalDocuments.publish('privacy_policy', {
				effectiveDate: new Date(),
				hash: 'sha256:x',
				version: '1',
			})
		).rejects.toThrow('legalDocuments.publish');
		await expect(client.status()).rejects.toThrow('status');
	});

	it('hands consents.check results back under the requested types', async () => {
		const client = createMockC15tClient({
			consents: {
				check: ({ types }) =>
					ok({
						results: Object.fromEntries(
							types.map((type) => [
								type,
								{ hasConsent: type === 'privacy_policy', isLatestPolicy: true },
							])
						),
					}),
			},
		});

		const result = await client.consents.check({
			externalId: 'user_1',
			types: ['privacy_policy', 'marketing_communications'],
		});

		const { results } = dataOf(result);
		expect(results.privacy_policy.hasConsent).toBe(true);
		expect(results.marketing_communications.hasConsent).toBe(false);
	});
});

describe('ok', () => {
	it('fills defaults', () => {
		const result = ok({ value: 1 });

		expect(result).toMatchObject({
			data: { value: 1 },
			ok: true,
			requestId: 'mock-request-id',
			status: 200,
		});
		expect(result.headers).toBeInstanceOf(Headers);
	});

	it('takes status, request id and headers', () => {
		const result = ok(null, {
			headers: { etag: '"abc"' },
			requestId: 'req_1',
			status: 304,
		});

		expect(result.status).toBe(304);
		expect(result.requestId).toBe('req_1');
		expect(result.headers.get('etag')).toBe('"abc"');
	});
});
