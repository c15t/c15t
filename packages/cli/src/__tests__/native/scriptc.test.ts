import { spawnSync } from 'node:child_process';
import {
	copyFile,
	cp,
	mkdtemp,
	mkdir,
	readFile,
	realpath,
	link,
	lstat,
	symlink,
	unlink,
	rm,
	writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

const packageRoot = resolve(import.meta.dirname, '../../..');
let directory = '';
let host = '';
let nodeHost = '';
let binary = '';
let frontendNodeHost = '';
let frontendBinary = '';
let runtimeBinary = '';
let runtimeNodeHost = '';
let agentBinary = '';
let agentNodeHost = '';

beforeAll(async () => {
	const compilerRoot = process.env.SCRIPTC_COMPILER_ROOT;
	if (!compilerRoot) {
		throw new Error(
			'Set SCRIPTC_COMPILER_ROOT to an installed @scriptc/compiler@0.2.0 package directory.'
		);
	}
	const { compile, renderDiagnostics } = await import(
		pathToFileURL(join(compilerRoot, 'dist/index.js')).href
	);
	directory = await mkdtemp(join(tmpdir(), 'c15t-native-'));
	const archive = join(directory, 'cli.tgz');
	const packed = spawnSync(
		'bun',
		['pm', 'pack', '--ignore-scripts', '--filename', archive, '--quiet'],
		{ cwd: packageRoot, encoding: 'utf8' }
	);
	expect(packed.status, packed.stdout + packed.stderr).toBe(0);
	const contents = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
	expect(contents.status, contents.stderr).toBe(0);
	expect(contents.stdout).toContain('package/src/generate/index.ts');
	expect(contents.stdout).not.toMatch(/__tests__|\.(?:test|spec)\./u);
	const installed = join(directory, 'node_modules/@c15t/cli');
	await mkdir(installed, { recursive: true });
	const unpacked = spawnSync(
		'tar',
		['-xzf', archive, '--strip-components=1', '-C', installed],
		{ encoding: 'utf8' }
	);
	expect(unpacked.status, unpacked.stderr).toBe(0);
	const source = dirname(
		createRequire(join(directory, 'package.json')).resolve(
			'@c15t/cli/generate/source'
		)
	);
	await cp(source, join(directory, 'vendor/generate'), {
		recursive: true,
	});
	await cp(
		dirname(
			createRequire(join(directory, 'package.json')).resolve(
				'@c15t/cli/frontend/source'
			)
		),
		join(directory, 'vendor/frontend'),
		{ recursive: true }
	);
	host = join(directory, 'host.ts');
	await copyFile(join(import.meta.dirname, 'host.ts'), host);
	nodeHost = join(directory, 'host-node.mjs');
	await writeFile(
		nodeHost,
		(await readFile(host, 'utf8')).replace(
			'./vendor/generate/index.ts',
			'@c15t/cli/generate'
		)
	);
	binary = join(directory, process.platform === 'win32' ? 'inth.exe' : 'inth');
	const result = await compile(host, {
		dynamic: false,
		outDir: join(directory, '.scriptc'),
		outPath: binary,
	});
	if (!result.ok) {
		throw new Error(renderDiagnostics(result.diagnostics, result.sourceTexts));
	}
	const frontendHost = join(directory, 'frontend-host.ts');
	await copyFile(join(import.meta.dirname, 'frontend-host.ts'), frontendHost);
	frontendNodeHost = join(directory, 'frontend-host.mjs');
	await writeFile(
		frontendNodeHost,
		(await readFile(frontendHost, 'utf8')).replace(
			'./vendor/frontend/index.ts',
			'@c15t/cli/frontend'
		)
	);
	frontendBinary = join(
		directory,
		process.platform === 'win32' ? 'inth-frontend.exe' : 'inth-frontend'
	);
	const frontendResult = await compile(frontendHost, {
		dynamic: false,
		outDir: join(directory, '.scriptc-frontend'),
		outPath: frontendBinary,
	});
	if (!frontendResult.ok) {
		throw new Error(
			renderDiagnostics(frontendResult.diagnostics, frontendResult.sourceTexts)
		);
	}
	const runtimeHost = join(directory, 'runtime-host.ts');
	await copyFile(join(import.meta.dirname, 'runtime-host.ts'), runtimeHost);
	runtimeNodeHost = join(directory, 'runtime-host.mjs');
	await writeFile(
		runtimeNodeHost,
		(await readFile(runtimeHost, 'utf8')).replace(
			'./vendor/frontend/runtime/index.ts',
			'@c15t/cli/frontend/runtime'
		)
	);
	runtimeBinary = join(directory, 'inth-runtime');
	const runtimeResult = await compile(runtimeHost, {
		dynamic: false,
		outDir: join(directory, '.scriptc-runtime'),
		outPath: runtimeBinary,
	});
	if (!runtimeResult.ok) {
		throw new Error(
			renderDiagnostics(runtimeResult.diagnostics, runtimeResult.sourceTexts)
		);
	}
	const agentHost = join(directory, 'agent-host.ts');
	await copyFile(join(import.meta.dirname, 'agent-host.ts'), agentHost);
	agentNodeHost = join(directory, 'agent-host.mjs');
	await writeFile(
		agentNodeHost,
		(await readFile(agentHost, 'utf8')).replace(
			'./vendor/frontend/agent/index.ts',
			'@c15t/cli/frontend/agent'
		)
	);
	agentBinary = join(directory, 'inth-agent');
	const agentResult = await compile(agentHost, {
		dynamic: false,
		outDir: join(directory, '.scriptc-agent'),
		outPath: agentBinary,
	});
	if (!agentResult.ok) {
		throw new Error(
			renderDiagnostics(agentResult.diagnostics, agentResult.sourceTexts)
		);
	}
});

it('matches Node agent prompts and launches Codex natively without Node on PATH', async () => {
	const node = spawnSync(process.execPath, [agentNodeHost, '--plan'], {
		encoding: 'utf8',
	});
	const native = spawnSync(agentBinary, ['--plan'], {
		encoding: 'utf8',
		env: { ...process.env, PATH: '' },
	});
	expect(node.status, node.stderr).toBe(0);
	expect(native.status, native.stderr).toBe(0);
	const nativePlan = JSON.parse(native.stdout);
	const nodePlan = JSON.parse(node.stdout);
	expect(nativePlan.agent).toBe(nodePlan.agent);
	const [nativeInstructions, nativeInputs] = nativePlan.prompt.split(
		'Public setup inputs:\n'
	);
	const [nodeInstructions, nodeInputs] = nodePlan.prompt.split(
		'Public setup inputs:\n'
	);
	expect(nativeInstructions).toBe(nodeInstructions);
	expect(JSON.parse(nativeInputs)).toEqual(JSON.parse(nodeInputs));
	const app = await mkdtemp(join(directory, 'agent-app-'));
	await writeFile(
		join(app, 'codex'),
		'#!/bin/sh\npwd > agent-cwd\nprintf "%s\\n" "$@" > agent-args\nexit 7\n',
		{ mode: 0o755 }
	);
	const launched = spawnSync(agentBinary, [], {
		cwd: app,
		encoding: 'utf8',
		env: { ...process.env, PATH: app },
	});
	expect(launched.status, launched.stderr).toBe(7);
	expect((await readFile(join(app, 'agent-cwd'), 'utf8')).trim()).toBe(
		await realpath(app)
	);
	expect(await readFile(join(app, 'agent-args'), 'utf8')).toBe(
		`--\n${JSON.parse(native.stdout).prompt}\n`
	);
	const missing = spawnSync(agentBinary, [], {
		cwd: directory,
		encoding: 'utf8',
		env: { ...process.env, PATH: '' },
	});
	expect(missing.status).toBe(1);
	expect(missing.stderr).toContain('Install the Codex CLI');
	await writeFile(
		join(app, 'codex'),
		'#!/bin/sh\necho started > agent-started\nexec /bin/sleep 30\n',
		{ mode: 0o755 }
	);
	const cancelled = spawnSync(agentBinary, ['--cancel'], {
		cwd: app,
		encoding: 'utf8',
		env: { ...process.env, PATH: app },
		timeout: 5000,
	});
	expect(cancelled.status, cancelled.stderr).toBe(1);
	expect(cancelled.stderr).toContain('Codex setup was cancelled');
	expect((await readFile(join(app, 'agent-started'), 'utf8')).trim()).toBe(
		'started'
	);
});

afterAll(async () => {
	if (directory) {
		await rm(directory, { force: true, recursive: true });
	}
});

it.each([
	['default', undefined],
	['offline', { mode: 'offline' }],
] as const)('matches Node agent inputs for %s setup', (preset, inputs) => {
	const args = ['--plan', preset];
	const native = spawnSync(agentBinary, args, {
		encoding: 'utf8',
		env: { ...process.env, PATH: '' },
	});
	const node = spawnSync(process.execPath, [agentNodeHost, ...args], {
		encoding: 'utf8',
	});
	expect(native.status, native.stderr).toBe(0);
	expect(node.status, node.stderr).toBe(0);
	const nativePrompt = JSON.parse(native.stdout).prompt.split(
		'Public setup inputs:\n'
	);
	const nodePrompt = JSON.parse(node.stdout).prompt.split(
		'Public setup inputs:\n'
	);
	expect(nativePrompt[0]).toBe(nodePrompt[0]);
	expect(nativePrompt[1] ? JSON.parse(nativePrompt[1]) : undefined).toEqual(
		inputs
	);
	expect(nodePrompt[1] ? JSON.parse(nodePrompt[1]) : undefined).toEqual(inputs);
});

it.each([
	'react',
	'next-app',
	'next-pages',
	'javascript',
	'tanstack-start',
	'vue',
	'nuxt',
	'svelte',
	'sveltekit',
	'solid',
	'astro',
	'astro-static',
])('matches Node generation for %s in both modes', (framework) => {
	for (const mode of ['hosted', 'offline']) {
		const args = [
			'c15t',
			'generate',
			mode,
			'--framework',
			framework,
			'--scripts',
			' google-tag,microsoft-clarity,google-tag, ',
			...(mode === 'hosted'
				? ['--backend-url', 'https://consent.example.com/a?b=c']
				: []),
		];
		const node = spawnSync(process.execPath, [nodeHost, ...args], {
			cwd: directory,
			encoding: 'utf8',
		});
		const native = spawnSync(binary, args, {
			cwd: tmpdir(),
			encoding: 'utf8',
		});
		expect(node.status, node.stderr).toBe(0);
		expect(native.status, native.stderr).toBe(0);
		expect(JSON.parse(native.stdout)).toEqual(JSON.parse(node.stdout));
		expect(native.stderr).toBe(node.stderr);
		expect(JSON.parse(native.stdout).dependencies).toContainEqual(
			'@c15t/integrations@alpha'
		);
	}
});

it.each(
	[
		[],
		['offline'],
		['offline', '--framework', 'unknown'],
		['hosted', '--framework', 'react'],
		['hosted', '--framework', 'react', '--backend-url', 'not-a-url'],
		['hosted', '--framework', 'react', '--backend-url', 'ftp://example.com'],
		['offline', '--framework', 'react', '--scripts', 'unknown'],
		['offline', '--framework', 'react', '--output', 'src'],
		['offline', '--framework', 'html'],
	].map((args) => ({ args }))
)('rejects invalid generation arguments $args', ({ args }) => {
	const result = spawnSync(binary, ['c15t', 'generate', ...args], {
		encoding: 'utf8',
	});
	expect(result.status).toBe(1);
	expect(result.stdout).toBe('');
	expect(result.stderr).not.toBe('');
});

it('accepts a forwarded mode flag in static generation', () => {
	const args = [
		'c15t',
		'generate',
		'--mode',
		'offline',
		'--framework',
		'react',
	];
	const native = spawnSync(binary, args, { encoding: 'utf8' });
	const node = spawnSync(process.execPath, [nodeHost, ...args], {
		encoding: 'utf8',
	});
	expect(native.status, native.stderr).toBe(0);
	expect(node.status, node.stderr).toBe(0);
	expect(JSON.parse(native.stdout)).toEqual(JSON.parse(node.stdout));
});

it.each(['missing', 'partial'])(
	'recovers an unpublished native stage with a %s journal',
	async (kind) => {
		const app = await mkdtemp(join(directory, 'unpublished-'));
		await writeFile(join(app, 'package.json'), '{}');
		await writeFile(join(app, 'user-file'), 'keep');
		const stage = join(app, '.c15t-native-generation');
		await mkdir(stage);
		if (kind === 'partial') {
			await writeFile(join(stage, 'journal.json'), '{');
		}
		const result = spawnSync(
			runtimeBinary,
			[
				'c15t',
				'generate',
				'--mode',
				'offline',
				'--resume',
				'--apply',
				'--skip-install',
			],
			{ cwd: app, encoding: 'utf8', env: { ...process.env, PATH: '' } }
		);
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout).recovered).toBe(true);
		expect(await readFile(join(app, 'user-file'), 'utf8')).toBe('keep');
		await expect(readFile(join(stage, 'journal.json'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	}
);

it.each(
	[
		['setup'],
		['generate'],
		['setup', 'offline'],
		['setup', '--backend-url', 'https://override.example.com'],
		['projects'],
		['projects', 'list'],
		['projects', 'select', 'two/app'],
		['projects', 'select', 'one'],
		['status'],
	].map((args) => ({ args }))
)('matches frontend command output for $args', ({ args }) => {
	const forwarded = ['c15t', ...args];
	const node = spawnSync(process.execPath, [frontendNodeHost, ...forwarded], {
		cwd: directory,
		encoding: 'utf8',
	});
	const native = spawnSync(frontendBinary, forwarded, {
		cwd: tmpdir(),
		encoding: 'utf8',
	});
	expect(node.status, node.stderr).toBe(0);
	expect(native.status, native.stderr).toBe(0);
	expect(JSON.parse(native.stdout)).toEqual(JSON.parse(node.stdout));
	expect(native.stderr).toBe(node.stderr);
});

it.each([
	{ args: ['setup'], env: { C15T_TEST_PROJECT: 'two/app' } },
	{ args: ['setup', 'offline'], env: { C15T_TEST_PROJECT: 'pending' } },
	{
		args: ['setup', '--backend-url', 'https://override.example.com'],
		env: { C15T_TEST_PROJECT: 'pending' },
	},
	{ args: ['status'], env: { C15T_TEST_EXPIRED: 'true' } },
	{ args: ['status'], env: { C15T_TEST_LOGGED_OUT: 'true' } },
])('uses supplied frontend state for $args with $env', ({ args, env }) => {
	const forwarded = ['c15t', ...args];
	const options = {
		cwd: tmpdir(),
		encoding: 'utf8' as const,
		env: { ...process.env, ...env },
	};
	const node = spawnSync(
		process.execPath,
		[frontendNodeHost, ...forwarded],
		options
	);
	const native = spawnSync(frontendBinary, forwarded, options);
	expect(node.status, node.stderr).toBe(0);
	expect(native.status, native.stderr).toBe(0);
	expect(JSON.parse(native.stdout)).toEqual(JSON.parse(node.stdout));
});

it.each(
	[
		['self-host', 'migrate'],
		['codemods'],
		['login'],
		['logout'],
		['projects', 'create', 'new-app'],
		['projects', 'select', 'app'],
		['projects', 'select', 'missing'],
		['projects', 'list', '--json'],
		['status', '--json'],
		['setup', '--apply'],
		['setup', '--framework', 'react', '--framework', 'vue'],
	].map((args) => ({ args }))
)('rejects unsupported frontend arguments $args', ({ args }) => {
	const result = spawnSync(frontendBinary, ['c15t', ...args], {
		encoding: 'utf8',
	});
	expect(result.status).toBe(1);
	expect(result.stdout).toBe('');
	expect(result.stderr).not.toBe('');
});

it.each(['pending', 'missing', 'app'])(
	'rejects unavailable selected backend %s',
	(selectedProject) => {
		const result = spawnSync(frontendBinary, ['c15t', 'setup'], {
			encoding: 'utf8',
			env: { ...process.env, C15T_TEST_PROJECT: selectedProject },
		});
		expect(result.status).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr).not.toBe('');
	}
);

it('plans and applies files natively, detects conflicts and installs alpha dependencies', async () => {
	const app = join(directory, 'runtime-app');
	await mkdir(app);
	await writeFile(join(app, 'package.json'), '{}');
	const invoke = (args: string[]) =>
		spawnSync(runtimeBinary, ['c15t', 'generate', ...args], {
			cwd: app,
			encoding: 'utf8',
		});
	const reviewed = invoke([]);
	const node = spawnSync(
		process.execPath,
		[runtimeNodeHost, 'c15t', 'generate'],
		{ cwd: app, encoding: 'utf8' }
	);
	expect(reviewed.status, reviewed.stderr).toBe(0);
	expect(JSON.parse(reviewed.stdout)).toEqual(JSON.parse(node.stdout));
	const { files } = JSON.parse(reviewed.stdout).plan;
	const applied = invoke(['--apply', '--skip-install']);
	expect(applied.status, applied.stderr).toBe(0);
	await Promise.all(
		files.map(async (file: { path: string; content: string }) => {
			expect(await readFile(join(app, file.path), 'utf8')).toBe(file.content);
		})
	);
	expect(
		JSON.parse(invoke(['--apply', '--skip-install']).stdout).created
	).toEqual([]);
	const bin = join(app, 'bin');
	await mkdir(bin);
	await writeFile(
		join(bin, 'npm'),
		'#!/bin/sh\npwd > install-cwd\nprintf "%s\\n" "$@" > install-args\necho installer-output\n',
		{ mode: 0o755 }
	);
	const installed = spawnSync(runtimeBinary, ['c15t', 'generate', '--apply'], {
		cwd: app,
		encoding: 'utf8',
		env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
	});
	expect(installed.status, installed.stderr).toBe(0);
	expect(JSON.parse(installed.stdout).installed).toBe(true);
	expect(installed.stderr).toContain('installer-output');
	expect((await readFile(join(app, 'install-cwd'), 'utf8')).trim()).toBe(
		await realpath(app)
	);
	expect(await readFile(join(app, 'install-args'), 'utf8')).toContain(
		'@c15t/react@alpha'
	);
	await writeFile(join(app, files[0].path), 'user changes');
	const conflict = invoke(['--apply', '--skip-install']);
	expect(conflict.status).toBe(1);
	expect(await readFile(join(app, files[0].path), 'utf8')).toBe('user changes');
});

it('recovers native interrupted applies and preserves identical replacement files', async () => {
	const app = await realpath(await mkdtemp(join(directory, 'recovery-')));
	await writeFile(join(app, 'package.json'), '{}');
	const { plan } = JSON.parse(
		spawnSync(runtimeBinary, ['c15t', 'generate'], {
			cwd: app,
			encoding: 'utf8',
		}).stdout
	);
	const stage = join(app, '.c15t-native-generation');
	const interrupt = async () => {
		await mkdir(stage);
		await writeFile(
			join(stage, 'journal.json'),
			JSON.stringify({ files: plan.files, root: app, version: 1 })
		);
		// Journal stages must be created before linking each target.
		/* oxlint-disable no-await-in-loop */
		for (const [index, file] of plan.files.entries()) {
			await mkdir(dirname(join(app, file.path)), { recursive: true });
			await writeFile(join(stage, `${index}.tmp`), file.content);
			await link(join(stage, `${index}.tmp`), join(app, file.path));
		}
		/* oxlint-enable no-await-in-loop */
	};
	await interrupt();
	const resumed = spawnSync(
		runtimeBinary,
		['c15t', 'generate', '--resume', '--apply', '--skip-install'],
		{ cwd: app, encoding: 'utf8' }
	);
	expect(resumed.status, resumed.stderr).toBe(0);
	expect(JSON.parse(resumed.stdout).recovered).toBe(true);
	await Promise.all(
		plan.files.map((file: { path: string }) => unlink(join(app, file.path)))
	);
	await interrupt();
	await unlink(join(app, plan.files[0].path));
	await writeFile(join(app, plan.files[0].path), plan.files[0].content);
	const replaced = spawnSync(
		runtimeBinary,
		['c15t', 'generate', '--resume', '--apply', '--skip-install'],
		{ cwd: app, encoding: 'utf8' }
	);
	expect(replaced.status, replaced.stderr).toBe(0);
	// The replacement belongs to the user, so it stays and is not recreated.
	expect(JSON.parse(replaced.stdout).created).toEqual(
		plan.files.slice(1).map((file: { path: string }) => file.path)
	);
	await Promise.all(
		plan.files.map((file: { path: string }) => unlink(join(app, file.path)))
	);
	await interrupt();
	await unlink(join(app, plan.files[0].path));
	await unlink(join(stage, '0.tmp'));
	await writeFile(join(app, plan.files[0].path), 'user file\n');
	const foreign = spawnSync(
		runtimeBinary,
		['c15t', 'generate', '--resume', '--apply', '--skip-install'],
		{ cwd: app, encoding: 'utf8' }
	);
	// A journaled target without its temp was never published by c15t.
	expect(foreign.status).toBe(1);
	expect(foreign.stderr).toContain('Refusing to overwrite');
	expect(await readFile(join(app, plan.files[0].path), 'utf8')).toBe(
		'user file\n'
	);
	await expect(readFile(join(stage, 'journal.json'))).rejects.toMatchObject({
		code: 'ENOENT',
	});
});

it('recovers native leftovers from a crash during cleanup and copied files', async () => {
	const app = await realpath(await mkdtemp(join(directory, 'cleanup-')));
	await writeFile(join(app, 'package.json'), '{}');
	const stage = join(app, '.c15t-native-generation');
	const resume = () =>
		spawnSync(
			runtimeBinary,
			['c15t', 'generate', '--resume', '--apply', '--skip-install'],
			{ cwd: app, encoding: 'utf8' }
		);
	await mkdir(stage);
	await writeFile(join(stage, '0.tmp'), 'A\n');
	await link(join(stage, '0.tmp'), join(app, 'a.ts'));
	const cleaned = resume();
	expect(cleaned.status, cleaned.stderr).toBe(0);
	expect(JSON.parse(cleaned.stdout).recovered).toBe(true);
	expect(await readFile(join(app, 'a.ts'), 'utf8')).toBe('A\n');
	await mkdir(stage);
	const files = [
		{ content: 'A\n', exists: false, path: 'copied/a.ts' },
		{ content: 'B\n', exists: false, path: 'copied/b.ts' },
	];
	await writeFile(
		join(stage, 'journal.json'),
		JSON.stringify({ directories: ['copied'], files, root: app, version: 1 })
	);
	await mkdir(join(app, 'copied'));
	/* oxlint-disable no-await-in-loop */
	for (const [index, file] of files.entries()) {
		await writeFile(join(stage, `${index}.tmp`), file.content);
		await writeFile(join(app, file.path), file.content);
		const { ctimeMs, dev, ino, mtimeMs, size } = await lstat(
			join(app, file.path)
		);
		await writeFile(
			join(stage, `${index}.copy`),
			JSON.stringify({
				ctimeUs: Math.round(ctimeMs * 1000),
				dev,
				ino,
				mtimeUs: Math.round(mtimeMs * 1000),
				size,
			})
		);
	}
	/* oxlint-enable no-await-in-loop */
	const copied = resume();
	expect(copied.status, copied.stderr).toBe(0);
	expect(JSON.parse(copied.stdout).recovered).toBe(true);
	await expect(lstat(join(app, 'copied'))).rejects.toMatchObject({
		code: 'ENOENT',
	});
});
it('rejects native symlink targets without writing through them', async () => {
	const app = await mkdtemp(join(directory, 'symlink-'));
	await writeFile(join(app, 'package.json'), '{}');
	await symlink(join(directory, 'nonexistent'), join(app, 'src'));
	const result = spawnSync(
		runtimeBinary,
		['c15t', 'generate', '--apply', '--skip-install'],
		{ cwd: app, encoding: 'utf8' }
	);
	expect(result.status).toBe(1);
	expect(result.stderr).toContain('symlink');
});
