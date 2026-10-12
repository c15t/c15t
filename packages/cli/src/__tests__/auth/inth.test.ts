import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	getAuthState,
	getSelectedInstanceId,
	setSelectedInstanceId,
} from '../../auth';
import { ControlPlaneClient } from '../../control-plane';
import * as cliPackage from '../../index';
import { createCliLogger, runCli } from '../../index';
import {
	inthRuntime,
	resolveInthExecutable,
	runInth,
	toC15tGuidance,
} from '../../inth/runner';

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
const failure = (
	code: string,
	message: string,
	requestId: string | null = null
) =>
	`process.stdout.write(JSON.stringify({schemaVersion:2,ok:false,error:{apiCode:null,code:${JSON.stringify(code)},httpStatus:null,message:${JSON.stringify(message)},requestId:${JSON.stringify(requestId)}}}));process.exit(1);`;

/**
 * Models Inth 0.0.4 login: `login --json` without an email always needs a
 * terminal, `--email` returns an approval link, `--complete` signs in and
 * selects the agent connection. Every call appends its arguments to calls.json.
 */
const realInthLogin = `const fs=require('node:fs');const args=process.argv.slice(2);
const calls=fs.existsSync('calls.json')?JSON.parse(fs.readFileSync('calls.json','utf8')):[];
calls.push(args);fs.writeFileSync('calls.json',JSON.stringify(calls));
const ok=(data)=>{process.stdout.write(JSON.stringify({schemaVersion:2,ok:true,data}));};
const fail=(code,message)=>{process.stdout.write(JSON.stringify({schemaVersion:2,ok:false,error:{apiCode:null,code,httpStatus:null,message,requestId:null}}));process.exit(1);};
if(args[0]==='auth'&&args[1]==='status'){
 if(!fs.existsSync('approved'))fail('authentication_required','Not signed in. Run inth login.');
 ok({assertionExpiresAt:Date.now()+3600000,credentialPresent:true,credentialSource:'auth.md',expiresAt:Date.now()+900000,status:'authenticated',validated:false});
}else if(args[0]==='login'&&args.includes('--complete')){
 if(!fs.existsSync('pending'))fail('authentication_required','Start auth.md sign-in with inth auth start --email <email> --yes.');
 fs.writeFileSync('approved','yes');ok({status:'authenticated'});
}else if(args[0]==='login'&&args.includes('--email')){
 fs.writeFileSync('pending','yes');
 ok({expiresAt:Date.now()+600000,nextStep:{command:'inth login --complete --wait --json',instruction:'x'},scopes:[],status:'pending',userCode:'123456',verificationUri:'https://dashboard.inth.com/agent/approve?code=123456'});
}else if(args[0]==='login'){
 fail('interaction_required','Browser login requires an interactive terminal. For agents, run inth login --email <email> --json and return the approval URL and code to the person. You can also run inth login in a terminal first, or supply an organization API key through INTH_TOKEN.');
}else{fail('usage_error','unexpected '+args.join(' '));}`;
const calls = async (cwd: string): Promise<string[][]> =>
	JSON.parse(await readFile(join(cwd, 'calls.json'), 'utf8'));

let home = '';
beforeEach(async () => {
	// Keep legacy ~/.c15t checks away from the developer's real home directory.
	home = await mkdtemp(join(tmpdir(), 'c15t-home-'));
	directories.push(home);
	vi.stubEnv('HOME', home);
	vi.stubEnv('USERPROFILE', home);
	vi.stubEnv('INTH_TOKEN', '');
});
const writeLegacyCredentials = async () => {
	await mkdir(join(home, '.c15t'));
	await writeFile(
		join(home, '.c15t/config.json'),
		JSON.stringify({ accessToken: 'old-token' })
	);
};

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

		it('signs out the selected and agent Inth connections and removes legacy credentials', async () => {
			const cwd = await fixture(
				`const fs=require('node:fs');const calls=fs.existsSync('calls.json')?JSON.parse(fs.readFileSync('calls.json','utf8')):[];calls.push(process.argv.slice(2));fs.writeFileSync('calls.json',JSON.stringify(calls));${json({ signedOut: true })}`
			);
			await writeLegacyCredentials();
			await writeFile(join(home, '.c15t/keep.json'), '{}');
			expect(await run(cwd, ['logout', '--json'])).toMatchObject({
				data: { authenticated: false, legacyCredentialsRemoved: true },
				success: true,
			});
			expect(await calls(cwd)).toEqual([
				['logout', '--json'],
				['logout', '--auth', 'agent', '--json'],
			]);
			expect(await readdir(join(home, '.c15t'))).toEqual(['keep.json']);
		});

		it('rejects a symlinked preference directory without writing through it', async () => {
			const cwd = await fixture(json(loggedIn));
			const target = await fixture(json(loggedIn));
			await symlink(target, join(cwd, '.c15t'));
			await expect(setSelectedInstanceId('one', cwd)).rejects.toMatchObject({
				code: 'PROJECT_PREFERENCE_INVALID',
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

		it('explains non-interactive login with c15t commands instead of running inth login', async () => {
			const cwd = await fixture(realInthLogin);
			const result = await run(cwd, ['login', '--json']);
			expect(result).toMatchObject({
				error: { code: 'INPUT_REQUIRED' },
				success: false,
			});
			expect(result.error?.message).toContain('c15t login --email <email>');
			expect(result.error?.message).toContain('INTH_TOKEN');
			expect(result.error?.message).not.toMatch(/\binth login\b/u);
			expect(await calls(cwd)).toEqual([['auth', 'status', '--json']]);
		});

		it('returns the approval link for --email --json, then completes with --complete', async () => {
			const cwd = await fixture(realInthLogin);
			const started = await run(cwd, [
				'login',
				'--email',
				'person@example.com',
				'--json',
			]);
			expect(started).toMatchObject({
				data: {
					authenticated: false,
					nextStep: { command: 'c15t login --complete --json' },
					status: 'pending',
					userCode: '123456',
					verificationUri:
						'https://dashboard.inth.com/agent/approve?code=123456',
				},
				success: true,
			});
			const completed = await run(cwd, [
				'login',
				'--complete',
				'--timeout',
				'5',
				'--json',
			]);
			expect(completed).toMatchObject({
				data: { authenticated: true, status: 'logged-in' },
				success: true,
			});
			expect(await calls(cwd)).toEqual([
				['auth', 'status', '--json'],
				[
					'login',
					'--email',
					'person@example.com',
					'--scopes',
					'organizations.read,organizations.write,projects.read,projects.write',
					'--json',
				],
				['login', '--complete', '--wait', '--timeout', '5', '--json'],
				['auth', 'status', '--json'],
			]);
			expect(await readdir(cwd)).not.toContain('config.json');
		});

		it('prints the approval link and waits for approval in human --email login', async () => {
			const cwd = await fixture(realInthLogin);
			const lines: string[] = [];
			const result = await runCli(
				['login', '--email', 'person@example.com', '--non-interactive'],
				{
					cwd,
					interactive: false,
					logger: createCliLogger('info', {
						write: (line) => lines.push(line),
					}),
				}
			);
			expect(result).toMatchObject({
				data: { authenticated: true },
				success: true,
			});
			const output = lines.join('\n');
			expect(output).toContain(
				'https://dashboard.inth.com/agent/approve?code=123456'
			);
			expect(output).toContain('123456');
			expect((await calls(cwd)).map((args) => args.slice(0, 2))).toEqual([
				['auth', 'status'],
				['login', '--email'],
				['login', '--complete'],
				['auth', 'status'],
			]);
		});

		it.each([
			[
				'Start auth.md sign-in with inth auth start --email <email> --yes.',
				'Start email sign-in with c15t login --email <email>.',
			],
			[
				'Still waiting for browser approval. Your sign-in is saved. Run inth login --complete --wait --json to resume waiting.',
				'Still waiting for browser approval. Your sign-in is saved. Run c15t login --complete to resume waiting.',
			],
			[
				'Your connection expired. Run inth logout --auth agent, then inth login --email <email> --json to sign in again.',
				'Your connection expired. Run c15t logout, then c15t login --email <email> to sign in again.',
			],
		])('rewrites Inth guidance %s', (message, expected) => {
			expect(toC15tGuidance(message)).toBe(expected);
		});

		it('rewrites Inth command guidance and keeps the request ID', async () => {
			const cwd = await fixture(
				failure(
					'authentication_required',
					'Your sign-in expired or was revoked. Run `inth login` again.',
					'req_123'
				)
			);
			const error = await runInth(['project', 'list'], { cwd }).catch(
				(caught: unknown) => caught
			);
			expect(error).toMatchObject({
				code: 'AUTH_NOT_LOGGED_IN',
				context: {
					details:
						'Your sign-in expired or was revoked. Run c15t login again. (request ID: req_123)',
					requestId: 'req_123',
				},
			});
		});

		it('reports a crash, not a cancellation, when Inth dies from another signal', async () => {
			const cwd = await fixture(`process.kill(process.pid,'SIGKILL');`);
			await expect(runInth(['project', 'list'], { cwd })).rejects.toMatchObject(
				{ code: 'INTH_CRASHED', context: { signal: 'SIGKILL' } }
			);
		});

		it('reports a missing executable as unavailable Inth, not a package install failure', async () => {
			const cwd = await fixture('');
			vi.spyOn(inthRuntime, 'resolveExecutable').mockReturnValue(
				join(cwd, 'missing-inth')
			);
			await expect(runInth(['auth', 'status'], { cwd })).rejects.toMatchObject({
				code: 'INTH_UNAVAILABLE',
			});
		});

		it('treats a browser session with an expired access token as logged in', async () => {
			const cwd = await fixture(
				json({
					credentialPresent: true,
					credentialSource: 'oauth',
					expiresAt: 1,
					validated: false,
				})
			);
			expect((await run(cwd, ['status', '--json'])).data).toMatchObject({
				authenticated: true,
				status: 'logged-in',
			});
		});

		it('reports expired once an agent connection can no longer be renewed', async () => {
			const cwd = await fixture(
				json({
					assertionExpiresAt: 1,
					credentialPresent: true,
					credentialSource: 'auth.md',
					expiresAt: 1,
					status: 'authenticated',
					validated: false,
				})
			);
			expect((await run(cwd, ['status', '--json'])).data).toMatchObject({
				authenticated: false,
				status: 'expired',
			});
		});

		it('tells signed-out users that the legacy c15t session is no longer used', async () => {
			const cwd = await fixture(
				failure('authentication_required', 'Not signed in. Run inth login.')
			);
			await writeLegacyCredentials();
			expect((await run(cwd, ['status', '--json'])).data).toMatchObject({
				legacySession: true,
				status: 'logged-out',
			});
			const projects = await run(cwd, ['projects', 'list', '--json']);
			expect(projects.error).toMatchObject({ code: 'AUTH_NOT_LOGGED_IN' });
			expect(projects.error?.message).toContain('~/.c15t/config.json');
		});

		it('names .c15t/project.json when the project preference is invalid', async () => {
			const cwd = await fixture(json(loggedIn));
			await mkdir(join(cwd, '.c15t'));
			await writeFile(join(cwd, '.c15t/project.json'), 'not json');
			const result = await run(cwd, ['status', '--json']);
			expect(result.error).toMatchObject({
				code: 'PROJECT_PREFERENCE_INVALID',
			});
			expect(result.error?.hint).toContain('.c15t/project.json');
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

describe('Inth platform preflight', () => {
	const resolved = () => '/app/node_modules/@inth/cli-linux-x64/bin/inth';

	it.each([
		[{ arch: 'x64', isMusl: false, platform: 'darwin' as const }, 'macOS x64'],
		[
			{ arch: 'x64', isMusl: true, platform: 'linux' as const },
			'Linux x64 (musl)',
		],
		[
			{ arch: 'ia32', isMusl: false, platform: 'win32' as const },
			'Windows ia32',
		],
	])('rejects %o with the platform name', (host, label) => {
		expect(() => resolveInthExecutable(host, resolved)).toThrow(
			expect.objectContaining({
				code: 'INTH_UNSUPPORTED_PLATFORM',
				context: expect.objectContaining({
					details: expect.stringContaining(label),
				}),
			})
		);
	});

	const linux = { arch: 'x64', isMusl: false, platform: 'linux' as const };

	it('explains a missing optional platform package', () => {
		expect(() =>
			resolveInthExecutable(linux, () => {
				throw new Error('Cannot find module');
			})
		).toThrow(
			expect.objectContaining({
				code: 'INTH_UNAVAILABLE',
				context: expect.objectContaining({
					details: expect.stringContaining('@inth/cli-linux-x64'),
				}),
			})
		);
	});

	it('explains that Yarn PnP cannot run Inth from a zip archive', () => {
		expect(() =>
			resolveInthExecutable(
				linux,
				() =>
					'/app/.yarn/cache/@inth-cli-linux-x64-npm-0.0.4.zip/node_modules/@inth/cli-linux-x64/bin/inth'
			)
		).toThrow(
			expect.objectContaining({
				code: 'INTH_UNAVAILABLE',
				context: expect.objectContaining({
					details: expect.stringContaining('unplugged'),
				}),
			})
		);
	});

	it('resolves supported platforms', () => {
		expect(resolveInthExecutable(linux, resolved)).toBe(resolved());
	});

	it('keeps the Inth runner out of the public package API', () => {
		expect(cliPackage).not.toHaveProperty('runInth');
		expect(cliPackage).not.toHaveProperty('resolveInthExecutable');
	});
});
