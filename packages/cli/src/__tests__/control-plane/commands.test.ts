import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSelectedInstanceId } from '../../auth';
import {
	createAction,
	projectsAction,
	selectAction,
} from '../../commands/instances';
import type { CliContext } from '../../context/types';
import * as inth from '../../inth/runner';

const directories: string[] = [];
const context = (
	cwd: string,
	flags: CliContext['flags'],
	commandArgs: string[] = []
): CliContext =>
	({
		commandArgs,
		cwd,
		flags,
		logger: { info: vi.fn(), message: vi.fn(), success: vi.fn() },
		projectRoot: cwd,
		telemetry: { trackEvent: vi.fn() },
	}) as unknown as CliContext;
const fixture = async () => {
	const cwd = await mkdtemp(join(tmpdir(), 'c15t-project-'));
	directories.push(cwd);
	return cwd;
};
afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(
		directories
			.splice(0)
			.map((cwd) => rm(cwd, { force: true, recursive: true }))
	);
});

describe('project command delegation', () => {
	it('requires provisioning inputs before running Inth without a terminal', async () => {
		const cwd = await fixture();
		const runner = vi.spyOn(inth, 'runInth');
		await expect(
			createAction(context(cwd, { 'non-interactive': true }))
		).rejects.toThrow();
		expect(runner).not.toHaveBeenCalled();
	});
	it('uses current regions, resolves organization IDs, and stores only the selected project', async () => {
		const cwd = await fixture();
		const runner = vi.spyOn(inth, 'runInth').mockImplementation((args) => {
			if (args[0] === 'org') {
				return Promise.resolve({
					data: [{ id: 'org_one', name: 'Org', slug: 'org' }],
					success: true,
				});
			}
			if (args[0] === 'region') {
				return Promise.resolve({
					data: [{ id: 'eu', label: 'Europe' }],
					success: true,
				});
			}
			return Promise.resolve({
				data: { consent: { backendUrl: null }, id: 'one', name: 'App' },
				success: true,
			});
		});
		await expect(
			createAction(
				context(cwd, {
					name: 'App',
					'non-interactive': true,
					organization: 'org',
					region: 'eu',
				})
			)
		).resolves.toMatchObject({ project: { id: 'one', status: 'pending' } });
		expect(runner).toHaveBeenCalledWith(
			expect.arrayContaining([
				'--organization',
				'org_one',
				'--branding',
				'c15t',
			]),
			{ cwd }
		);
		expect(await getSelectedInstanceId(cwd)).toBe('one');
	});
	it('rejects ambiguous project names without changing selection', async () => {
		const cwd = await fixture();
		vi.spyOn(inth, 'runInth').mockResolvedValue({
			data: ['one', 'two'].map((id) => ({
				consent: { backendUrl: null },
				id,
				name: 'App',
			})),
			success: true,
		});
		await expect(
			selectAction(context(cwd, { 'non-interactive': true, project: 'App' }))
		).rejects.toThrow();
		expect(await getSelectedInstanceId(cwd)).toBeNull();
	});
	it.each([
		{ args: ['typo'], flags: {} },
		{ args: ['list'], flags: { name: 'ignored' } },
		{ args: ['create', 'one'], flags: { name: 'two' } },
		{ args: ['select', 'one', 'two'], flags: {} },
	])('rejects unsupported or conflicting inputs $args', ({ args, flags }) => {
		const runner = vi.spyOn(inth, 'runInth');
		expect(() => projectsAction(context('/unused', flags, args))).toThrow();
		expect(runner).not.toHaveBeenCalled();
	});
});
