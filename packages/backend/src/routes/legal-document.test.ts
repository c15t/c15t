import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { LegalDocumentPolicyConflictError } from '~/db/registry/consent-policy';
import type { C15TContext } from '~/types';
import { createLegalDocumentRoutes } from './legal-document';

function createApp(options?: {
	apiKeyAuthenticated?: boolean;
	syncCurrentLegalDocumentPolicy?: ReturnType<typeof vi.fn>;
}) {
	const logger = {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
	const registry = {
		syncCurrentLegalDocumentPolicy:
			options?.syncCurrentLegalDocumentPolicy ??
			vi.fn().mockResolvedValue({
				id: 'pol_1',
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
				isActive: true,
			}),
	};
	const c15tContext = {
		logger,
		registry,
		apiKeyAuthenticated: options?.apiKeyAuthenticated ?? true,
	} as unknown as C15TContext;

	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();
	app.use('*', async (c, next) => {
		c.set('c15tContext', c15tContext);
		await next();
	});
	app.route('/legal-documents', createLegalDocumentRoutes());

	return { app, registry };
}

describe('createLegalDocumentRoutes', () => {
	it('syncs the current release when the request is authenticated', async () => {
		const { app, registry } = createApp();

		const response = await app.request(
			'http://localhost/legal-documents/privacy_policy/current',
			{
				method: 'PUT',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					version: '2026-04-07',
					hash: 'hash_123',
					effectiveDate: '2026-04-07T00:00:00.000Z',
				}),
			}
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(registry.syncCurrentLegalDocumentPolicy).toHaveBeenCalledWith({
			type: 'privacy_policy',
			version: '2026-04-07',
			hash: 'hash_123',
			effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
		});
		expect(body).toEqual({
			policy: {
				id: 'pol_1',
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: '2026-04-07T00:00:00.000Z',
				isActive: true,
			},
		});
	});

	it('rejects requests without API key authentication', async () => {
		const { app } = createApp({ apiKeyAuthenticated: false });

		const response = await app.request(
			'http://localhost/legal-documents/privacy_policy/current',
			{
				method: 'PUT',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					version: '2026-04-07',
					hash: 'hash_123',
					effectiveDate: '2026-04-07T00:00:00.000Z',
				}),
			}
		);

		expect(response.status).toBe(401);
	});

	it('returns conflict when the synced release metadata does not match the existing row', async () => {
		const { app } = createApp({
			syncCurrentLegalDocumentPolicy: vi
				.fn()
				.mockRejectedValue(
					new LegalDocumentPolicyConflictError(
						'Release metadata conflicts with existing consent policy'
					)
				),
		});

		const response = await app.request(
			'http://localhost/legal-documents/privacy_policy/current',
			{
				method: 'PUT',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					version: '2026-04-07',
					hash: 'hash_123',
					effectiveDate: '2026-04-07T00:00:00.000Z',
				}),
			}
		);
		const body = await response.text();

		expect(response.status).toBe(409);
		expect(body).toContain(
			'Release metadata conflicts with existing consent policy'
		);
	});
});
