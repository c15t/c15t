import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import * as p from '@clack/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getConfigPath, saveConfig } from '../../auth/config-store';
import { login } from '../../auth/login';
import { logoutCommand } from '../../commands/auth';
import type { CliContext } from '../../context/types';
import { createUserInteraction } from '../../context/user-interaction';

let home: string;
beforeEach(async () => {
	home = await fs.mkdtemp(path.join(os.tmpdir(), 'c15t-logout-'));
	vi.spyOn(os, 'homedir').mockReturnValue(home);
});
afterEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	await fs.rm(home, { force: true, recursive: true });
});
describe('logout', () => {
	it('removes expired access and refresh credentials', async () => {
		await saveConfig({
			accessToken: 'expired',
			expiresAt: Date.now() - 1000,
			refreshToken: 'refresh',
		});
		const context = {
			commandArgs: [],
			logger: { success: vi.fn() },
			telemetry: { trackEvent: vi.fn() },
		} as unknown as CliContext;
		await expect(logoutCommand.action(context)).resolves.toEqual({
			authenticated: false,
		});
		await expect(fs.access(getConfigPath())).rejects.toThrow();
	});
});

describe('login confirmation', () => {
	it('opens the verification page without prompting when --yes is set', async () => {
		const prompt = vi.fn(() => Promise.resolve(false));
		const open = vi.fn(() => Promise.resolve());
		const context = {
			error: {
				handleCancel: vi.fn(() => {
					throw new Error('Cancelled');
				}),
			},
			flags: { yes: true },
			logger: { info: vi.fn(), message: vi.fn(), warn: vi.fn() },
		} as unknown as CliContext;
		context.confirm = createUserInteraction(context, {
			confirm: prompt,
			isCancel: p.isCancel,
		}).confirm;
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(
					Response.json({
						data: {
							deviceCode: 'test-code',
							expiresIn: 900,
							interval: 0.001,
							userCode: 'TEST-CODE',
							verificationUri: 'https://inth.com/device',
						},
						success: true,
					})
				)
				.mockResolvedValueOnce(
					Response.json({
						data: { accessToken: 'test-token', tokenType: 'Bearer' },
						success: true,
					})
				)
		);
		await expect(login(context, { open })).resolves.toMatchObject({
			authenticated: true,
		});
		expect(prompt).not.toHaveBeenCalled();
		expect(open).toHaveBeenCalledWith(
			'https://inth.com/device?user_code=TEST-CODE'
		);
	});
});
