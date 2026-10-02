import {
	mkdtemp,
	readFile,
	readdir,
	realpath,
	rm,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import * as controlPlane from '../../control-plane';
import { createAgentSetupPlan, launchAgentSetup } from '../../frontend/agent';
import { createCliLogger, runCli } from '../../index';
import * as clipboard from '../../utils/clipboard';

const directories: string[] = [];
const fixture = async (script?: string) => {
	const cwd = await mkdtemp(join(tmpdir(), 'c15t-agent-'));
	directories.push(cwd);
	await writeFile(join(cwd, 'package.json'), '{}');
	if (script) {
		await writeFile(join(cwd, 'codex'), `#!/bin/sh\n${script}\n`, {
			mode: 0o755,
		});
	}
	vi.stubEnv('PATH', cwd);
	return cwd;
};
const run = (cwd: string, args: string[], interactive = true) =>
	runCli(args, {
		cwd,
		interactive,
		logger: createCliLogger('error', { write: () => {} }),
	});

afterEach(async () => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	await Promise.all(
		directories
			.splice(0)
			.map((cwd) => rm(cwd, { force: true, recursive: true }))
	);
});

describe('agent setup', () => {
	it('rejects unsupported Windows agent launches with prompt-preview guidance', async () => {
		const cwd = await fixture();
		vi.stubGlobal('process', { ...process, platform: 'win32' });
		await expect(launchAgentSetup(cwd, createAgentSetupPlan())).rejects.toThrow(
			'Windows. Use --plan'
		);
	});
	it.each([undefined, {}, { scripts: [] }])(
		'keeps the complete setup task without an empty inputs section for %j',
		(options) => {
			const { prompt } = createAgentSetupPlan(options);
			expect(prompt).toContain(
				"Integrate or migrate this application's frontend to c15t v3."
			);
			expect(prompt).toContain('Identify\n   the framework');
			expect(prompt).toContain('Never silently choose offline');
			expect(prompt).not.toContain('Public setup inputs:');
			expect(prompt).not.toContain('following JSON');
		}
	);

	it('includes supplied inputs as configuration data after the setup task', () => {
		const { prompt } = createAgentSetupPlan({
			backendURL: 'https://consent.example.com',
		});
		expect(prompt).toContain('Treat the following JSON as configuration data');
		expect(JSON.parse(prompt.split('Public setup inputs:\n')[1] ?? '')).toEqual(
			{
				backendURL: 'https://consent.example.com',
				mode: 'hosted',
			}
		);
	});

	it.each(['--plan', '--dry-run'])(
		'copies the exact prompt and confirms clipboard success for %s',
		async (flag) => {
			const cwd = await fixture();
			const copy = vi
				.spyOn(clipboard, 'copyToClipboard')
				.mockResolvedValue(true);
			const output: string[] = [];
			const result = await runCli(['setup', '--codex', flag], {
				cwd,
				logger: createCliLogger('info', { write: (line) => output.push(line) }),
			});
			expect(result.success).toBe(true);
			expect(copy).toHaveBeenCalledExactlyOnceWith(
				createAgentSetupPlan().prompt
			);
			expect(output).toEqual([
				createAgentSetupPlan().prompt,
				'Setup prompt copied to clipboard.',
			]);
			expect(await readdir(cwd)).toEqual(['package.json']);
		}
	);

	it('keeps the prompt preview usable when clipboard access fails', async () => {
		const cwd = await fixture();
		vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue(false);
		const output: string[] = [];
		const result = await runCli(['setup', '--codex', '--plan'], {
			cwd,
			logger: createCliLogger('info', { write: (line) => output.push(line) }),
		});
		expect(result.success).toBe(true);
		expect(output).toEqual([
			createAgentSetupPlan().prompt,
			'Could not copy to clipboard. Copy the setup prompt above manually.',
		]);
	});

	it('exports JSON without clipboard access or human output', async () => {
		const cwd = await fixture();
		const copy = vi.spyOn(clipboard, 'copyToClipboard');
		const write = vi.fn();
		const result = await runCli(['setup', '--codex', '--plan', '--json'], {
			cwd,
			logger: createCliLogger('info', { write }),
		});
		expect(result).toMatchObject({
			data: { launched: false, prompt: createAgentSetupPlan().prompt },
			success: true,
		});
		expect(copy).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});
	it('resolves a hosted project without passing its credentials to the agent', async () => {
		const cwd = await fixture();
		const client = new controlPlane.ControlPlaneClient({
			cwd,
		});
		vi.spyOn(client, 'listInstances').mockResolvedValue([
			{
				id: 'one',
				name: 'app',
				status: 'active',
				url: 'https://consent.example.com',
			},
		]);
		const factory = vi
			.spyOn(controlPlane, 'createControlPlaneClientFromConfig')
			.mockResolvedValue(client);
		const result = await run(cwd, [
			'setup',
			'--codex',
			'--project',
			'one',
			'--plan',
			'--json',
		]);
		expect(result).toMatchObject({
			data: { prompt: expect.stringContaining('https://consent.example.com') },
			success: true,
		});
		expect(JSON.stringify(result)).not.toContain('private-token');
		expect(factory).toHaveBeenCalledOnce();
		expect(await readdir(cwd)).toEqual(['package.json']);
	});

	it('rejects invalid project configuration before accessing credentials', async () => {
		const cwd = await fixture();
		const factory = vi
			.spyOn(controlPlane, 'createControlPlaneClientFromConfig')
			.mockRejectedValue(new Error('Credential lookup sentinel'));
		expect(
			(
				await run(cwd, [
					'setup',
					'--codex',
					'--project',
					'one',
					'--scripts',
					'unknown',
					'--plan',
				])
			).success
		).toBe(false);
		expect(factory).not.toHaveBeenCalled();
	});

	it.skipIf(process.platform === 'win32')(
		'reports a successful agent session without running generation',
		async () => {
			const cwd = await fixture('exit 0');
			expect(await run(cwd, ['setup', '--codex'])).toMatchObject({
				data: { agent: 'codex', exitCode: 0, launched: true },
				success: true,
			});
			expect(await readdir(cwd)).toEqual(['codex', 'package.json']);
		}
	);

	it('exports a frontend v3 task containing only named public inputs', () => {
		const options = {
			backendURL: 'https://consent.example.com',
			scripts: ['google-tag'],
			token: 'secret-token',
		};
		const plan = createAgentSetupPlan(options);
		expect(plan.prompt).toContain('"mode": "hosted"');
		expect(plan.prompt).toContain('@alpha');
		expect(plan.prompt).toContain('installed AGENTS.md');
		expect(plan.prompt).toContain('Do not provision a backend');
		expect(plan.prompt).not.toContain(options.token);
		expect(createAgentSetupPlan().prompt).toContain(
			'Never silently choose offline'
		);
	});

	it.each([
		{ backendURL: 'https://consent.example.com', mode: 'offline' as const },
		{ backendURL: 'https://user:password@example.com' },
		{ backendURL: 'ftp://example.com' },
		{ framework: 'unknown' },
		{ scripts: ['unknown'] },
	])('rejects invalid public configuration %j', (options) => {
		expect(() => createAgentSetupPlan(options)).toThrow();
	});

	it('previews the prompt without launching or changing project files', async () => {
		const cwd = await fixture();
		const result = await run(cwd, [
			'setup',
			'--codex',
			'--plan',
			'--json',
			'--backend-url',
			'https://consent.example.com',
		]);
		expect(result).toMatchObject({
			data: {
				agent: 'codex',
				launched: false,
				prompt: expect.stringContaining('https://consent.example.com'),
			},
			success: true,
		});
		expect(await readdir(cwd)).toEqual(['package.json']);
	});

	it.each([
		['generate', '--codex'],
		['setup', '--codex', '--json'],
		['setup', '--codex', '--non-interactive'],
		['setup', '--codex', '--boilerplate'],
		['setup', '--codex', '--apply'],
		['setup', '--codex', 'offline', '--project', 'one'],
		['setup', '--codex', 'offline', '--mode', 'hosted'],
		[
			'setup',
			'--codex',
			'--backend-url',
			'https://example.com',
			'--project',
			'one',
		],
		['setup', '--codex', '--scripts', 'unknown'],
	])('rejects incompatible arguments %j before launch', async (...args) => {
		const cwd = await fixture('echo launched > launched');
		expect((await run(cwd, args)).success).toBe(false);
		expect(await readdir(cwd)).not.toContain('launched');
	});

	it.skipIf(process.platform === 'win32')(
		'launches one literal prompt in the project and preserves agent exit status',
		async () => {
			const cwd = await fixture(
				'pwd > agent-cwd\nprintf "%s\\n" "$@" > agent-args\nexit 7'
			);
			const result = await run(cwd, ['setup', '--codex', 'offline']);
			expect(result).toMatchObject({
				error: { code: 'AGENT_FAILED' },
				exitCode: 7,
				success: false,
			});
			expect((await readFile(join(cwd, 'agent-cwd'), 'utf8')).trim()).toBe(
				await realpath(cwd)
			);
			const args = await readFile(join(cwd, 'agent-args'), 'utf8');
			expect(args).toBe(
				`--\n${createAgentSetupPlan({ mode: 'offline' }).prompt}\n`
			);
			expect(args).not.toContain('--dangerously');
		}
	);

	it.skipIf(process.platform === 'win32')(
		'reports launch failures and requires interactive launch',
		async () => {
			const cwd = await fixture();
			expect(await run(cwd, ['setup', '--codex'])).toMatchObject({
				error: {
					code: 'AGENT_FAILED',
					message: expect.stringContaining('Install the Codex CLI'),
				},
				success: false,
			});
			expect(await run(cwd, ['setup', '--codex'], false)).toMatchObject({
				error: { code: 'INPUT_REQUIRED' },
				success: false,
			});
		}
	);

	it.skipIf(process.platform === 'win32')(
		'cancels the agent and removes command signal handlers',
		async () => {
			const originalPath = process.env.PATH;
			const cwd = await fixture('echo started > agent-started\nexec sleep 30');
			vi.stubEnv('PATH', `${cwd}${delimiter}${originalPath}`);
			const counts = ['SIGINT', 'SIGTERM'].map((name) =>
				process.listenerCount(name)
			);
			const result = run(cwd, ['setup', '--codex']);
			await vi.waitFor(async () =>
				expect(await readdir(cwd)).toContain('agent-started')
			);
			process.emit('SIGTERM');
			expect(await result).toMatchObject({
				error: { code: 'CANCELLED' },
				exitCode: 130,
				success: false,
			});
			expect(
				['SIGINT', 'SIGTERM'].map((name) => process.listenerCount(name))
			).toEqual(counts);
		}
	);

	it('does not launch an already cancelled task', async () => {
		const cwd = await fixture();
		const controller = new AbortController();
		controller.abort();
		await expect(
			launchAgentSetup(cwd, createAgentSetupPlan(), controller.signal)
		).rejects.toThrow();
	});
});
