import { afterEach, describe, expect, it, vi } from 'vitest';

import { ControlPlaneClient } from '../../control-plane/client';
import {
	requireInstanceBackendUrl,
	resolveInstance,
} from '../../control-plane/projects';
import * as inth from '../../inth/runner';

afterEach(() => vi.restoreAllMocks());
describe('Inth project adapter', () => {
	it('never substitutes a dashboard URL for a pending consent backend', async () => {
		vi.spyOn(inth, 'runInth').mockResolvedValue({
			data: [
				{
					consent: { backendUrl: null },
					dashboardUrl: 'https://example.com/dashboard',
					id: 'pending',
					name: 'Pending',
				},
			],
			success: true,
		});
		const projects = await new ControlPlaneClient().listInstances();
		expect(projects[0]).toMatchObject({ status: 'pending', url: '' });
		expect(() =>
			requireInstanceBackendUrl(resolveInstance('pending', projects))
		).toThrow();
	});
	it('rejects malformed project API data', async () => {
		vi.spyOn(inth, 'runInth').mockResolvedValue({ data: {}, success: true });
		await expect(new ControlPlaneClient().listInstances()).rejects.toThrow();
	});
	it('reports invalid project fields as API errors without leaking response data', async () => {
		vi.spyOn(inth, 'runInth').mockResolvedValue({
			data: {
				consent: { backendUrl: 'private-secret' },
				id: 'one',
				name: 'App',
			},
			success: true,
		});
		await expect(
			new ControlPlaneClient().getInstance('one')
		).rejects.toMatchObject({
			code: 'API_ERROR',
			context: { details: 'Invalid Inth resource data.' },
		});
	});
	it('rejects repeated or missing pagination cursors', async () => {
		vi.spyOn(inth, 'runInth').mockResolvedValue({
			data: [],
			pagination: { hasMore: true, nextCursor: 'same' },
			success: true,
		});
		await expect(
			new ControlPlaneClient().listInstances()
		).rejects.toMatchObject({ code: 'API_ERROR' });
	});
	it('creates through the current Inth command with explicit c15t branding', async () => {
		const runner = vi.spyOn(inth, 'runInth').mockResolvedValue({
			data: { consent: { backendUrl: null }, id: 'one', name: 'App' },
			success: true,
		});
		await expect(
			new ControlPlaneClient({ cwd: '/app' }).createInstance({
				config: {
					organizationSlug: 'org_one',
					region: 'eu',
					trustedOrigins: ['https://app.example.com'],
				},
				name: 'App',
			})
		).resolves.toMatchObject({ id: 'one', status: 'pending' });
		expect(runner).toHaveBeenCalledWith(
			[
				'project',
				'create',
				'--name',
				'App',
				'--region',
				'eu',
				'--organization',
				'org_one',
				'--branding',
				'c15t',
				'--trusted-origins',
				'["https://app.example.com"]',
			],
			{ cwd: '/app' }
		);
	});
});
