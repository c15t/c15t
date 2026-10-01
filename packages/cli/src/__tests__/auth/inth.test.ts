import {
	mkdtemp,
	readFile,
	readdir,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	getAuthState,
	getSelectedInstanceId,
	setSelectedInstanceId,
} from '../../auth';
import { ControlPlaneClient } from '../../control-plane';
import { createCliLogger, runCli } from '../../index';
import { inthRuntime, runInth } from '../../inth/runner';

const directories: string[] = [];
const fixture = async (body: string) => {
	const cwd = await mkdtemp(join(tmpdir(), 'c15t-inth-'));
	directories.push(cwd);
	await writeFile(join(cwd, 'package.json'), '{}');
	const executable = join(cwd, 'inth');
	await writeFile(executable, `#!${process.execPath}\n${body}`, {
		mode: 0o755,
	});
	vi.spyOn(inthRuntime, 'resolveExecutable').mockReturnValue(executable);
	return cwd;
};
const run = (cwd: string, args: string[]) =>
	runCli(args, {
		cwd,
		interactive: false,
		logger: createCliLogger('error', { write: () => {} }),
	});
const loggedIn = {
	credentialPresent: true,
	credentialSource: 'api_key',
	expiresAt: null,
	validated: false,
};
const json = (data: unknown) =>
	`process.stdout.write(JSON.stringify({schemaVersion:2,ok:true,data:${JSON.stringify(data)}}));`;

afterEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	await Promise.all(
		directories
			.splice(0)
			.map((cwd) => rm(cwd, { force: true, recursive: true }))
	);
});

describe.skipIf(process.platform === 'win32')(
	'Inth executable delegation',
	() => {
		it('inherits credentials, cwd, and literal arguments without exposing tokens', async () => {
			const cwd = await fixture(
				`const fs=require('node:fs');fs.writeFileSync('args.json',JSON.stringify(process.argv.slice(2)));${json(loggedIn)}`
			);
			vi.stubEnv('INTH_TOKEN', 'inth_private');
			await expect(getAuthState({ cwd })).resolves.toMatchObject({
				credentialSource: 'api_key',
				isExpired: false,
				isLoggedIn: true,
			});
			expect(
				JSON.parse(await readFile(join(cwd, 'args.json'), 'utf8'))
			).toEqual(['auth', 'status', '--json']);
			expect((await run(cwd, ['status', '--json'])).data).toMatchObject({
				authenticated: true,
				status: 'logged-in',
			});
			expect(await readdir(cwd)).not.toContain('config.json');
		});

		it('keeps project preferences isolated between applications without credentials', async () => {
			const one = await fixture(json(loggedIn));
			const two = await fixture(json(loggedIn));
			await setSelectedInstanceId('project-one', one);
			expect(await getSelectedInstanceId(one)).toBe('project-one');
			expect(await getSelectedInstanceId(two)).toBeNull();
			expect(
				JSON.parse(await readFile(join(one, '.c15t/project.json'), 'utf8'))
			).toEqual({ selectedProject: 'project-one' });
		});

		it('delegates logout to Inth instead of deleting c15t credentials', async () => {
			const cwd = await fixture(
				`require('node:fs').writeFileSync('args.json',JSON.stringify(process.argv.slice(2)));${json({ signedOut: true })}`
			);
			expect(await run(cwd, ['logout', '--json'])).toMatchObject({
				data: { authenticated: false },
				success: true,
			});
			expect(
				JSON.parse(await readFile(join(cwd, 'args.json'), 'utf8'))
			).toEqual(['logout', '--json']);
		});

		it('rejects a symlinked preference directory without writing through it', async () => {
			const cwd = await fixture(json(loggedIn));
			const target = await fixture(json(loggedIn));
			await symlink(target, join(cwd, '.c15t'));
			await expect(setSelectedInstanceId('one', cwd)).rejects.toMatchObject({
				code: 'CONFIG_INVALID',
			});
			expect(await readdir(target)).not.toContain('project.json');
		});

		it('resolves agent setup from the Inth consent backend without storing credentials', async () => {
			const cwd = await fixture(
				json({
					data: [
						{
							consent: { backendUrl: 'https://consent.example.com' },
							id: 'one',
							name: 'App',
						},
					],
					success: true,
				})
			);
			const result = await run(cwd, [
				'setup',
				'--codex',
				'--project',
				'one',
				'--plan',
				'--json',
			]);
			expect(result).toMatchObject({
				data: { launched: false },
				success: true,
			});
			expect(JSON.stringify(result.data)).toContain(
				'https://consent.example.com'
			);
			expect(await readdir(cwd)).not.toContain('.c15t');
		});

		it.each(
			[
				[
					'setup',
					'--codex',
					'--backend-url',
					'https://consent.example.com',
					'--plan',
					'--json',
				],
				['generate', 'offline', '--plan', '--json'],
			].map((args) => ({ args }))
		)(
			'does not invoke Inth for explicit frontend inputs $args',
			async ({ args }) => {
				const cwd = await fixture(
					`require('node:fs').writeFileSync('invoked','yes');process.exit(1);`
				);
				expect(await run(cwd, args)).toMatchObject({ success: true });
				expect(await readdir(cwd)).not.toContain('invoked');
			}
		);

		it('honors cancellation before spawning Inth', async () => {
			const cwd = await fixture(
				`require('node:fs').writeFileSync('invoked','yes');`
			);
			await expect(
				runInth(['project', 'list'], { cwd, signal: AbortSignal.abort() })
			).rejects.toMatchObject({ code: 'CANCELLED' });
			expect(await readdir(cwd)).not.toContain('invoked');
		});

		it('delegates unattended login to Inth without starting its own device flow', async () => {
			const cwd = await fixture(
				`const fs=require('node:fs');const args=process.argv.slice(2);let data=${JSON.stringify(loggedIn)};if(args[0]==='login'){fs.writeFileSync('logged-in','yes');}else if(!fs.existsSync('logged-in')){process.stdout.write(JSON.stringify({schemaVersion:2,ok:false,error:{code:'authentication_required',message:'not signed in'}}));process.exit(1);}process.stdout.write(JSON.stringify({schemaVersion:2,ok:true,data}));`
			);
			expect(await run(cwd, ['login', '--json'])).toMatchObject({
				data: { authenticated: true },
				success: true,
			});
			expect(await readdir(cwd)).toContain('logged-in');
			expect(await readdir(cwd)).not.toContain('config.json');
		});

		it('presents logged-out state without returning native error payloads', async () => {
			const cwd = await fixture(
				`process.stdout.write(JSON.stringify({schemaVersion:2,ok:false,error:{code:'authentication_required',message:'Not signed in'}}));process.exit(1);`
			);
			expect(await run(cwd, ['status', '--json'])).toMatchObject({
				data: { authenticated: false, status: 'logged-out' },
				success: true,
			});
		});

		it.each(['not JSON', '{"ok":true,"schemaVersion":1,"data":{}}'])(
			'rejects invalid native output %s',
			async (output) => {
				const cwd = await fixture(
					`process.stdout.write(${JSON.stringify(output)});`
				);
				await expect(runInth(['auth', 'status'], { cwd })).rejects.toThrow();
			}
		);

		it('cancels the native subprocess and removes its signal listeners', async () => {
			const cwd = await fixture(
				`require('node:fs').writeFileSync('started','yes');setTimeout(()=>{},30000);`
			);
			const counts = ['SIGINT', 'SIGTERM'].map((name) =>
				process.listenerCount(name)
			);
			const promise = runInth(['project', 'list'], { cwd });
			await vi.waitFor(async () =>
				expect(await readdir(cwd)).toContain('started')
			);
			process.emit('SIGTERM');
			await expect(promise).rejects.toMatchObject({ code: 'CANCELLED' });
			expect(
				['SIGINT', 'SIGTERM'].map((name) => process.listenerCount(name))
			).toEqual(counts);
		});

		it('reads all project pages and uses consent.backendUrl rather than dashboardUrl', async () => {
			const cwd = await fixture(
				`const cursor=process.argv.includes('--cursor');const data=cursor?[{id:'two',name:'second',consent:{backendUrl:null},dashboardUrl:'https://dashboard.example.com'}]:[{id:'one',name:'first',consent:{backendUrl:'https://consent.example.com'}}];${json(null)} `.replace(
					json(null),
					`process.stdout.write(JSON.stringify({schemaVersion:2,ok:true,data:{success:true,data,pagination:{hasMore:!cursor,nextCursor:cursor?null:'next'}}}));`
				)
			);
			expect(
				await new ControlPlaneClient({ cwd }).listInstances()
			).toMatchObject([
				{ id: 'one', status: 'active', url: 'https://consent.example.com' },
				{ id: 'two', status: 'pending', url: '' },
			]);
		});
	}
);
