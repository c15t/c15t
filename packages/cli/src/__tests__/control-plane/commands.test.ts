import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSelectedInstanceId, saveConfig } from '../../auth';
import {
	createAction,
	projectsAction,
	selectAction,
} from '../../commands/instances';
import type { CliContext } from '../../context/types';

const context = (
	flags: CliContext['flags'],
	commandArgs: string[] = []
): CliContext =>
	({
		commandArgs,
		flags,
		logger: { info: vi.fn(), message: vi.fn(), success: vi.fn() },
		telemetry: { trackEvent: vi.fn() },
	}) as unknown as CliContext;
let home: string;
beforeEach(async () => {
	home = await fs.mkdtemp(path.join(os.tmpdir(), 'c15t-projects-'));
	vi.spyOn(os, 'homedir').mockReturnValue(home);
	await saveConfig({ accessToken: 'test-token' });
});
afterEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	await fs.rm(home, { force: true, recursive: true });
});
describe('project command input', () => {
	it('requires provisioning inputs before fetching or prompting without a terminal', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await expect(
			createAction(context({ 'non-interactive': true }))
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
	it('passes explicit provisioning inputs and returns the created project', async () => {
		const fetch = vi.fn((url: string, init: RequestInit) => {
			if (url.endsWith('/organizations')) {
				return Promise.resolve(
					Response.json({
						data: [
							{
								organizationId: 'org',
								organizationName: 'Org',
								organizationSlug: 'org',
								role: 'owner',
							},
						],
						success: true,
					})
				);
			}
			if (url.endsWith('/regions')) {
				return Promise.resolve(
					Response.json({
						data: [{ family: 'v2', id: 'eu-west-1', label: 'Europe' }],
						success: true,
					})
				);
			}
			expect(init.method).toBe('POST');
			expect(JSON.parse(String(init.body))).toMatchObject({
				name: 'app',
				organizationSlug: 'org',
				region: 'eu-west-1',
			});
			return Promise.resolve(
				Response.json({
					data: {
						backendURL: null,
						instanceId: 'project',
						instanceName: 'app',
					},
					success: true,
				})
			);
		});
		vi.stubGlobal('fetch', fetch);
		await expect(
			createAction(
				context({
					name: 'app',
					'non-interactive': true,
					organization: 'org',
					region: 'eu-west-1',
				})
			)
		).resolves.toMatchObject({
			project: { id: 'project', status: 'pending', url: '' },
		});
		expect(await getSelectedInstanceId()).toBe('project');
	});
	it('rejects ambiguous names without changing the default project', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					data: ['one', 'two'].map((organizationSlug) => ({
						backendURL: null,
						instanceId: organizationSlug,
						instanceName: 'app',
						organizationSlug,
					})),
					success: true,
				})
			)
		);
		await expect(
			selectAction(context({ 'non-interactive': true, project: 'app' }))
		).rejects.toThrow();
		expect(await getSelectedInstanceId()).toBeNull();
	});
	it('throws for an unknown subcommand instead of listing projects', () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		expect(() => projectsAction(context({}, ['typo']))).toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
	it.each([
		[['list'], { name: 'ignored' }],
		[['create', 'one'], { name: 'two' }],
		[['select', 'one', 'two'], {}],
	] as const)('rejects ignored or conflicting inputs: %s', (args, flags) => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		expect(() => projectsAction(context(flags, [...args]))).toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
});
