import { afterEach, describe, expect, it, vi } from 'vitest';

import { ControlPlaneClient } from '../../control-plane/client';
import {
	requireInstanceBackendUrl,
	resolveInstance,
} from '../../control-plane/projects';

const client = () =>
	new ControlPlaneClient({
		accessToken: 'test-token',
		baseUrl: 'https://example.com',
		timeout: 10,
	});
afterEach(() => vi.unstubAllGlobals());
describe('hosted projects', () => {
	it('never substitutes a dashboard URL for a pending backend', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					data: [
						{
							backendURL: null,
							dashboardURL: 'https://example.com/dashboard',
							instanceId: 'pending',
							instanceName: 'Pending',
						},
					],
					success: true,
				})
			)
		);
		const projects = await client().listInstances();
		expect(projects[0]).toMatchObject({ status: 'pending', url: '' });
		expect(() =>
			requireInstanceBackendUrl(resolveInstance('pending', projects))
		).toThrow();
	});
	it('rejects malformed API data', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json({ data: {}, success: true }))
		);
		await expect(client().listInstances()).rejects.toThrow(
			'API request failed'
		);
	});
	it('attaches a request deadline', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(Response.json({ data: [], success: true }));
		vi.stubGlobal('fetch', fetch);
		await client().listInstances();
		expect(fetch.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
	});
	it('rejects ambiguous names and accepts organization/name', () => {
		const projects = ['one', 'two'].map((org) => ({
			id: org,
			name: 'app',
			organizationSlug: org,
			status: 'active' as const,
			url: 'https://example.com',
		}));
		expect(() => resolveInstance('app', projects)).toThrow();
		expect(resolveInstance('two/app', projects).id).toBe('two');
	});
	it('aborts a stalled request at the configured deadline', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(_url: string, init: RequestInit) =>
					new Promise((_resolve, reject) => {
						init.signal?.addEventListener(
							'abort',
							() => reject(init.signal?.reason),
							{ once: true }
						);
					})
			)
		);
		await expect(client().listInstances()).rejects.toMatchObject({
			context: { details: 'Control-plane request timed out' },
		});
	});
});
