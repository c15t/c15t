import { describe, expect, it, vi } from 'vitest';

import type { CliCommand } from '../../context/types';
import { CliError } from '../../core/errors';
import { runCli } from '../../index';
import { packageInfo } from '../../package-info';
import { createCliLogger } from '../../utils/logger';

const logger = createCliLogger('error', { write: () => {} });
const command = (action: CliCommand['action']): CliCommand => ({
	action,
	description: 'Inspect',
	hint: 'Inspect',
	label: 'Inspect',
	name: 'inspect',
});

describe('embeddable command runner', () => {
	it('gets the CLI version without requiring a project or changing exit status', async () => {
		const { exitCode } = process;
		const result = await runCli(['--version', '--json'], {
			cwd: '/nonexistent/c15t-audit',
			logger,
		});
		expect(result).toMatchObject({
			data: { version: packageInfo.version },
			exitCode: 0,
			success: true,
		});
		expect(process.exitCode).toBe(exitCode);
	});
	it('returns command-specific help without running the action', async () => {
		const action = vi.fn();
		const result = await runCli(['inspect', '--help', '--json'], {
			commands: [command(action)],
			logger,
		});
		expect(result).toMatchObject({
			data: { description: 'Inspect', usage: 'c15t inspect' },
		});
		expect(action).not.toHaveBeenCalled();
	});
	it('returns structured failures without exiting the host', async () => {
		const result = await runCli(['inspect'], {
			commands: [command(() => Promise.reject(new Error('Broken backend')))],
			logger,
		});
		expect(result).toMatchObject({
			error: { message: 'An unexpected error occurred: Broken backend' },
			exitCode: 1,
			schemaVersion: 1,
			success: false,
		});
	});
	it('returns cancellation as a distinct nonzero status', async () => {
		const result = await runCli(['inspect'], {
			commands: [
				command((context) =>
					Promise.resolve().then(() => context.error.handleCancel())
				),
			],
			logger,
		});
		expect(result).toMatchObject({
			error: { code: 'CANCELLED' },
			exitCode: 130,
			success: false,
		});
	});
	it('returns data and explicit cwd without mutating the host working directory', async () => {
		const before = process.cwd();
		const result = await runCli(['inspect', '--json', '--cwd', '/tmp'], {
			commands: [
				command((context) =>
					Promise.resolve({
						cwd: context.cwd,
						interactive: !context.flags['non-interactive'],
					})
				),
			],
			logger,
		});
		expect(result).toMatchObject({ data: { cwd: '/tmp', interactive: false } });
		expect(process.cwd()).toBe(before);
	});
	it('returns help for a noninteractive empty invocation', async () => {
		expect(await runCli([], { logger })).toMatchObject({
			data: { usage: 'c15t <command> [options]' },
			success: true,
		});
	});
	it('keeps command messages off stdout in JSON mode', async () => {
		const stdout = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		const stderr = vi
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);
		try {
			const result = await runCli(['inspect', '--json'], {
				commands: [
					command((context) => {
						context.logger.message('Human-readable details');
						return Promise.resolve({ inspected: true });
					}),
				],
			});
			expect(result.success).toBe(true);
			expect(stdout).not.toHaveBeenCalled();
			expect(stderr).toHaveBeenCalledWith('Human-readable details\n');
		} finally {
			stdout.mockRestore();
			stderr.mockRestore();
		}
	});
	it('preserves actionable typed errors', async () => {
		const result = await runCli(['inspect'], {
			commands: [
				command(() =>
					Promise.reject(
						new CliError('INPUT_REQUIRED', {
							details: 'Provide --organization',
						})
					)
				),
			],
			logger,
		});
		expect(result).toMatchObject({
			error: {
				code: 'INPUT_REQUIRED',
				message: 'Interactive input required: Provide --organization',
			},
		});
	});
});
