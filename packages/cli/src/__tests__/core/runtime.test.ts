import fs, {
	chmodSync,
	existsSync,
	linkSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
	applyGeneration,
	installGenerationDependencies,
	planGeneration,
	recoverGeneration,
	runGenerationWorkflow,
} from '../../frontend/runtime';

let root = '';
const generation = {
	dependencies: ['@c15t/react'],
	files: { 'README.c15t.md': 'instructions\n', 'src/privacy.ts': 'hello\n' },
	instructions: ['Wire the provider.'],
};
beforeEach(() => {
	root = realpathSync(mkdtempSync(join(tmpdir(), 'c15t-runtime-')));
	writeFileSync(join(root, 'package.json'), '{}');
});
afterEach(() => {
	vi.restoreAllMocks();
	syncBuiltinESMExports();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	rmSync(root, { force: true, recursive: true });
});

it('removes an unpublished stage after a journal write fails and permits retry', () => {
	const plan = planGeneration(root, generation);
	const failure = new Error('ENOSPC: journal could not be persisted');
	vi.spyOn(fs, 'fsyncSync').mockImplementationOnce(() => {
		throw failure;
	});
	syncBuiltinESMExports();
	expect(() => applyGeneration(plan)).toThrow(failure);
	expect(existsSync(join(root, '.c15t-native-generation'))).toBe(false);
	expect(existsSync(join(root, 'README.c15t.md'))).toBe(false);
	expect(applyGeneration(planGeneration(root, generation))).toHaveLength(2);
});

it.each([undefined, '{'])(
	'recovers an unpublished stage with journal %s',
	(journal) => {
		const stage = join(root, '.c15t-native-generation');
		mkdirSync(stage);
		if (journal !== undefined) {
			writeFileSync(join(stage, 'journal.json'), journal);
		}
		writeFileSync(join(root, 'user-file'), 'keep');
		expect(recoverGeneration(root)).toBe(true);
		expect(existsSync(stage)).toBe(false);
		expect(readFileSync(join(root, 'user-file'), 'utf8')).toBe('keep');
		expect(() => planGeneration(root, generation)).not.toThrow();
	}
);

it('preserves an incomplete journal with unexpected staged contents', () => {
	const stage = join(root, '.c15t-native-generation');
	mkdirSync(stage);
	writeFileSync(join(stage, 'foreign'), 'keep');
	expect(() => recoverGeneration(root)).toThrow();
	expect(readFileSync(join(stage, 'foreign'), 'utf8')).toBe('keep');
});

it('rejects Windows dependency launches before publishing files but allows skip-install', async () => {
	vi.stubGlobal('process', { ...process, platform: 'win32' });
	const args = [
		'generate',
		'--mode',
		'offline',
		'--framework',
		'react',
		'--apply',
	];
	await expect(
		runGenerationWorkflow(args, {}, { cwd: root, packageManager: 'npm' })
	).rejects.toThrow('Windows');
	expect(existsSync(join(root, 'src'))).toBe(false);
	await expect(
		installGenerationDependencies(root, ['react'], 'npm')
	).rejects.toThrow('Windows');
	await expect(
		installGenerationDependencies(root, [], 'npm')
	).resolves.toBeUndefined();
	const applied = await runGenerationWorkflow(
		[...args, '--skip-install'],
		{},
		{ cwd: root }
	);
	expect(applied.applied).toBe(true);
	expect(applied.installed).toBe(false);
});

const interrupted = () => {
	const stage = join(root, '.c15t-native-generation');
	mkdirSync(stage);
	mkdirSync(join(root, 'src'));
	const files = Object.entries(generation.files).map(([path, content]) => ({
		content,
		exists: false,
		path,
	}));
	writeFileSync(
		join(stage, 'journal.json'),
		JSON.stringify({ files, root, version: 1 })
	);
	for (const [index, file] of files.entries()) {
		writeFileSync(join(stage, `${index}.tmp`), file.content);
		linkSync(join(stage, `${index}.tmp`), join(root, file.path));
	}
	return stage;
};

it('reviews without writes, applies complete files and preserves matching files', () => {
	const plan = planGeneration(root, generation);
	expect(plan.dependencies).toEqual(['@c15t/react@alpha']);
	expect(existsSync(join(root, 'src'))).toBe(false);
	expect(applyGeneration(plan)).toEqual(['README.c15t.md', 'src/privacy.ts']);
	expect(readFileSync(join(root, 'src/privacy.ts'), 'utf8')).toBe('hello\n');
	expect(existsSync(join(root, '.c15t-native-generation'))).toBe(false);
	expect(applyGeneration(planGeneration(root, generation))).toEqual([]);
});
it('validates every reviewed file before creating any files', () => {
	const plan = planGeneration(root, generation);
	writeFileSync(join(root, 'README.c15t.md'), 'user edits');
	expect(() => applyGeneration(plan)).toThrow('changed since planning');
	expect(existsSync(join(root, 'src'))).toBe(false);
	expect(readFileSync(join(root, 'README.c15t.md'), 'utf8')).toBe('user edits');
});
it('detects edits to files that already matched at review', () => {
	writeFileSync(
		join(root, 'README.c15t.md'),
		generation.files['README.c15t.md']
	);
	const plan = planGeneration(root, generation);
	unlinkSync(join(root, 'README.c15t.md'));
	expect(() => applyGeneration(plan)).toThrow('changed since planning');
});
it.each([
	'../escape',
	'/tmp/escape',
	'.git/config',
	'.GIT/config',
	'.C15T-native-generation/file',
	'.c15t-generation.json/child',
	'.c15t-native-generation/file',
	'.c15t-generation.json',
	'src\\escape',
	'C:escape',
	'.',
])('rejects unsafe target %s', (path) => {
	expect(() =>
		planGeneration(root, { ...generation, files: { [path]: 'unsafe' } })
	).toThrow();
});
it.each(['src', 'src/privacy.ts', 'package.json'])(
	'rejects dangling symlinks at %s',
	(path) => {
		if (path.includes('/')) {
			mkdirSync(join(root, 'src'));
		}
		if (path === 'package.json') {
			unlinkSync(join(root, path));
		}
		symlinkSync(join(root, 'missing'), join(root, path));
		expect(() => planGeneration(root, generation)).toThrow('symlink');
	}
);
it('rejects duplicate canonical targets', () => {
	expect(() =>
		planGeneration(root, {
			...generation,
			files: { 'src/./a': 'x', 'src/a': 'x' },
		})
	).toThrow('Duplicate');
});
it('recovers hard-linked generated files and refuses new plans until recovery', () => {
	interrupted();
	expect(() => planGeneration(root, generation)).toThrow('--resume');
	expect(recoverGeneration(root)).toBe(true);
	expect(existsSync(join(root, 'src/privacy.ts'))).toBe(false);
	expect(recoverGeneration(root)).toBe(false);
});
it('preserves all files when recovery finds an edited generated file', () => {
	const stage = interrupted();
	writeFileSync(join(root, 'README.c15t.md'), 'user changes');
	expect(() => recoverGeneration(root)).toThrow('changed since apply');
	expect(existsSync(join(root, 'src/privacy.ts'))).toBe(true);
	expect(existsSync(stage)).toBe(true);
});
it('keeps an identical replacement and removes the files it still owns', () => {
	const stage = interrupted();
	const target = join(root, 'README.c15t.md');
	unlinkSync(target);
	writeFileSync(target, generation.files['README.c15t.md']);
	expect(recoverGeneration(root)).toBe(true);
	expect(readFileSync(target, 'utf8')).toBe(generation.files['README.c15t.md']);
	expect(existsSync(join(root, 'src/privacy.ts'))).toBe(false);
	expect(existsSync(stage)).toBe(false);
});
it.each([
	'traversal',
	'foreign root',
	'unexpected file',
	'symlink journal',
	'partial journal',
])('preserves files for an invalid recovery record: %s', (kind) => {
	const stage = interrupted();
	const journal = join(stage, 'journal.json');
	if (kind === 'unexpected file') {
		writeFileSync(join(stage, 'foreign'), 'keep');
	} else if (kind === 'symlink journal') {
		unlinkSync(journal);
		symlinkSync(join(root, 'package.json'), journal);
	} else if (kind === 'partial journal') {
		writeFileSync(journal, '{');
	} else {
		writeFileSync(
			journal,
			JSON.stringify({
				files: [{ content: 'x', exists: false, path: '../outside' }],
				root: kind === 'foreign root' ? '/tmp' : root,
				version: 1,
			})
		);
	}
	expect(() => recoverGeneration(root)).toThrow();
	expect(existsSync(join(root, 'src/privacy.ts'))).toBe(true);
});
it('requires explicit apply and an installation choice', async () => {
	const context = {
		generation: {
			backendURL: 'https://consent.example.com',
			framework: 'react' as const,
		},
	};
	const reviewed = await runGenerationWorkflow(['generate'], context, {
		cwd: root,
	});
	expect(reviewed.applied).toBe(false);
	expect(existsSync(join(root, 'src'))).toBe(false);
	await expect(
		runGenerationWorkflow(['generate', '--apply'], context, { cwd: root })
	).rejects.toThrow('package manager');
	await expect(
		runGenerationWorkflow(['generate', '--apply', '--dry-run'], context, {
			cwd: root,
		})
	).rejects.toThrow('--apply');
	const applied = await runGenerationWorkflow(
		['generate', '--apply', '--skip-install'],
		context,
		{ cwd: root }
	);
	expect(applied.created.length).toBeGreaterThan(0);
	expect(applied.installed).toBe(false);
});
it.each(['npm', 'pnpm', 'yarn', 'bun'] as const)(
	'installs alpha dependencies using %s in the application directory',
	async (manager) => {
		const bin = join(root, 'bin');
		mkdirSync(bin);
		const executable = join(bin, manager);
		writeFileSync(
			executable,
			'#!/bin/sh\npwd > install-cwd\nprintf "%s\\n" "$@" > install-args\necho installer-output\n'
		);
		chmodSync(executable, 0o755);
		vi.stubEnv('PATH', `${bin}:${process.env.PATH}`);
		await installGenerationDependencies(
			root,
			['@c15t/react', 'react@19'],
			manager
		);
		expect(readFileSync(join(root, 'install-cwd'), 'utf8').trim()).toBe(root);
		expect(
			readFileSync(join(root, 'install-args'), 'utf8').split('\n').slice(0, 3)
		).toEqual([
			manager === 'npm' ? 'install' : 'add',
			'@c15t/react@alpha',
			'react@19',
		]);
	}
);
it('keeps committed files and supplies a retry command on installer failure', async () => {
	const bin = join(root, 'bin');
	mkdirSync(bin);
	writeFileSync(join(bin, 'npm'), '#!/bin/sh\nexit 7\n');
	chmodSync(join(bin, 'npm'), 0o755);
	vi.stubEnv('PATH', `${bin}:${process.env.PATH}`);
	await expect(
		runGenerationWorkflow(
			['generate', '--apply'],
			{ generation: { framework: 'react', mode: 'offline' } },
			{ cwd: root, packageManager: 'npm' }
		)
	).rejects.toThrow('retry npm install');
	expect(existsSync(join(root, 'src/consent/consent-manager.tsx'))).toBe(true);
	expect(existsSync(join(root, '.c15t-native-generation'))).toBe(false);
});
it('rejects dependency options, symlink manifests and pre-cancelled installs', async () => {
	await expect(
		installGenerationDependencies(root, ['--ignore-scripts'], 'npm')
	).rejects.toThrow('argument');
	unlinkSync(join(root, 'package.json'));
	symlinkSync(join(root, 'missing'), join(root, 'package.json'));
	await expect(
		installGenerationDependencies(root, ['react'], 'npm')
	).rejects.toThrow('regular package.json');
	const controller = new AbortController();
	controller.abort();
	await expect(
		installGenerationDependencies(root, ['react'], 'npm', controller.signal)
	).rejects.toThrow();
});

it('rejects generated files that would become parents of other targets', () => {
	expect(() =>
		planGeneration(root, {
			...generation,
			files: { 'new-file': 'x', 'new-file/child': 'y' },
		})
	).toThrow('parents');
	expect(existsSync(join(root, 'new-file'))).toBe(false);
});
it('cancels a running installer while keeping committed generation files', async () => {
	const bin = join(root, 'bin');
	mkdirSync(bin);
	writeFileSync(
		join(bin, 'npm'),
		'#!/bin/sh\necho started > installer-started\nexec sleep 30\n'
	);
	chmodSync(join(bin, 'npm'), 0o755);
	vi.stubEnv('PATH', `${bin}:${process.env.PATH}`);
	const controller = new AbortController();
	const workflow = runGenerationWorkflow(
		['generate', 'offline', '--framework', 'react', '--apply'],
		{},
		{ cwd: root, packageManager: 'npm', signal: controller.signal }
	);
	const checked = expect(workflow).rejects.toThrow('cancelled');
	await vi.waitFor(() =>
		expect(existsSync(join(root, 'installer-started'))).toBe(true)
	);
	controller.abort();
	await checked;
	expect(existsSync(join(root, 'src/consent/consent-manager.tsx'))).toBe(true);
});

it('revalidates the application manifest before applying a reviewed plan', () => {
	const plan = planGeneration(root, generation);
	unlinkSync(join(root, 'package.json'));
	symlinkSync(join(root, 'missing'), join(root, 'package.json'));
	expect(() => applyGeneration(plan)).toThrow('symlink');
	expect(existsSync(join(root, 'src'))).toBe(false);
});

const stagePath = () => join(root, '.c15t-native-generation');
const three = {
	dependencies: [],
	files: { 'a.ts': 'A\n', 'b.ts': 'B\n', 'c.ts': 'C\n' },
	instructions: [],
};
const linkError = (code: string) =>
	Object.assign(new Error(`${code}: link failed`), { code });
/** Run `before` ahead of the nth hard-link publication, then link for real. */
const beforeLink = (call: number, before: (target: string) => void) => {
	const link = fs.linkSync;
	let calls = 0;
	vi.spyOn(fs, 'linkSync').mockImplementation((existing, target) => {
		calls += 1;
		if (calls === call) {
			before(String(target));
		}
		link(existing, target);
	});
	syncBuiltinESMExports();
};

it('rolls back published files and keeps a file another process created', () => {
	const plan = planGeneration(root, three);
	beforeLink(2, (target) => writeFileSync(target, 'theirs\n'));
	expect(() => applyGeneration(plan)).toThrow('EEXIST');
	expect(existsSync(join(root, 'a.ts'))).toBe(false);
	expect(readFileSync(join(root, 'b.ts'), 'utf8')).toBe('theirs\n');
	expect(existsSync(join(root, 'c.ts'))).toBe(false);
	expect(existsSync(stagePath())).toBe(false);
	expect(recoverGeneration(root)).toBe(false);
});

it('leaves journaled targets alone when their temp was never written', () => {
	const stage = stagePath();
	mkdirSync(stage);
	const files = [
		{ content: 'A\n', exists: false, path: 'a.ts' },
		{ content: 'B\n', exists: false, path: 'b.ts' },
	];
	writeFileSync(
		join(stage, 'journal.json'),
		JSON.stringify({ files, root, version: 1 })
	);
	writeFileSync(join(stage, '0.tmp'), 'A\n');
	linkSync(join(stage, '0.tmp'), join(root, 'a.ts'));
	writeFileSync(join(root, 'b.ts'), 'B\n');
	expect(recoverGeneration(root)).toBe(true);
	expect(existsSync(join(root, 'a.ts'))).toBe(false);
	expect(readFileSync(join(root, 'b.ts'), 'utf8')).toBe('B\n');
	expect(existsSync(stage)).toBe(false);
});

it.each(['journal removed first', 'temp removed first'])(
	'recovers a crash during final cleanup: %s',
	(order) => {
		const stage = interrupted();
		unlinkSync(
			join(stage, order === 'journal removed first' ? 'journal.json' : '0.tmp')
		);
		expect(recoverGeneration(root)).toBe(true);
		expect(existsSync(stage)).toBe(false);
		// Files whose ownership can no longer be proven stay in place.
		expect(readFileSync(join(root, 'README.c15t.md'), 'utf8')).toBe(
			'instructions\n'
		);
		expect(existsSync(join(root, 'src/privacy.ts'))).toBe(
			order === 'journal removed first'
		);
		expect(() =>
			applyGeneration(planGeneration(root, generation))
		).not.toThrow();
		expect(readFileSync(join(root, 'src/privacy.ts'), 'utf8')).toBe('hello\n');
	}
);

it.each(['EXDEV', 'EPERM', 'ENOTSUP'])(
	'publishes exclusive copies when hard links fail with %s',
	(code) => {
		vi.spyOn(fs, 'linkSync').mockImplementation(() => {
			throw linkError(code);
		});
		syncBuiltinESMExports();
		expect(applyGeneration(planGeneration(root, generation))).toEqual([
			'README.c15t.md',
			'src/privacy.ts',
		]);
		expect(readFileSync(join(root, 'src/privacy.ts'), 'utf8')).toBe('hello\n');
		expect(existsSync(stagePath())).toBe(false);
	}
);

it('rolls back copied files without touching a conflicting file', () => {
	const plan = planGeneration(root, three);
	const write = fs.openSync;
	let copies = 0;
	vi.spyOn(fs, 'linkSync').mockImplementation(() => {
		throw linkError('EXDEV');
	});
	vi.spyOn(fs, 'openSync').mockImplementation((path, flags, mode) => {
		if (String(path) === join(root, 'b.ts')) {
			copies += 1;
			writeFileSync(path, 'theirs\n');
		}
		return write(path, flags, mode);
	});
	syncBuiltinESMExports();
	expect(() => applyGeneration(plan)).toThrow('EEXIST');
	expect(copies).toBe(1);
	expect(existsSync(join(root, 'a.ts'))).toBe(false);
	expect(readFileSync(join(root, 'b.ts'), 'utf8')).toBe('theirs\n');
	expect(existsSync(stagePath())).toBe(false);
});

it('recovers interrupted copies only when their recorded identity matches', () => {
	const stage = stagePath();
	mkdirSync(stage);
	const files = [
		{ content: 'A\n', exists: false, path: 'a.ts' },
		{ content: 'B\n', exists: false, path: 'b.ts' },
	];
	writeFileSync(
		join(stage, 'journal.json'),
		JSON.stringify({ files, root, version: 1 })
	);
	for (const [index, file] of files.entries()) {
		writeFileSync(join(stage, `${index}.tmp`), file.content);
		writeFileSync(join(root, file.path), file.content);
		const { dev, ino } = fs.lstatSync(join(root, file.path));
		writeFileSync(join(stage, `${index}.copy`), JSON.stringify({ dev, ino }));
	}
	// An identical replacement is a different file and belongs to the user.
	unlinkSync(join(root, 'b.ts'));
	writeFileSync(join(root, 'b.ts'), 'B\n');
	expect(recoverGeneration(root)).toBe(true);
	expect(existsSync(join(root, 'a.ts'))).toBe(false);
	expect(readFileSync(join(root, 'b.ts'), 'utf8')).toBe('B\n');
	expect(existsSync(stage)).toBe(false);
});

it('removes directories created by a rolled-back apply only when empty', () => {
	mkdirSync(join(root, 'src'));
	const plan = planGeneration(root, {
		dependencies: [],
		files: {
			'lib/a.ts': 'A\n',
			'src/consent/a.ts': 'A\n',
			'src/consent/deep/b.ts': 'B\n',
		},
		instructions: [],
	});
	beforeLink(3, () => {
		writeFileSync(join(root, 'lib/user.ts'), 'mine\n');
		throw linkError('EIO');
	});
	expect(() => applyGeneration(plan)).toThrow('EIO');
	expect(existsSync(join(root, 'src'))).toBe(true);
	expect(existsSync(join(root, 'src/consent'))).toBe(false);
	expect(readFileSync(join(root, 'lib/user.ts'), 'utf8')).toBe('mine\n');
	expect(existsSync(stagePath())).toBe(false);
});

it('names the original failure when rollback also fails', () => {
	const plan = planGeneration(root, three);
	beforeLink(2, (target) => {
		writeFileSync(target, 'theirs\n');
		// An edit to an already published file blocks automatic rollback.
		writeFileSync(join(root, 'a.ts'), 'edited\n');
	});
	let failure: unknown;
	try {
		applyGeneration(plan);
	} catch (error) {
		failure = error;
	}
	expect(failure).toBeInstanceOf(Error);
	expect((failure as Error).message).toMatch(
		/EEXIST.*changed since apply: a\.ts.*preserved/u
	);
	expect((failure as Error).cause).toMatchObject({ code: 'EEXIST' });
	expect(existsSync(stagePath())).toBe(true);
});

it('reports cancellation between apply and install with the created files', async () => {
	const bin = join(root, 'bin');
	mkdirSync(bin);
	writeFileSync(join(bin, 'npm'), '#!/bin/sh\necho ran > installer-ran\n');
	chmodSync(join(bin, 'npm'), 0o755);
	vi.stubEnv('PATH', `${bin}:${process.env.PATH}`);
	const controller = new AbortController();
	beforeLink(1, () => controller.abort());
	await expect(
		runGenerationWorkflow(
			['generate', '--apply'],
			{ generation: { framework: 'react', mode: 'offline' } },
			{ cwd: root, packageManager: 'npm', signal: controller.signal }
		)
	).rejects.toThrow(
		/cancelled\. Generated files remain\. Created: .*src\/consent\/consent-manager\.tsx/u
	);
	expect(existsSync(join(root, 'src/consent/consent-manager.tsx'))).toBe(true);
	expect(existsSync(join(root, 'installer-ran'))).toBe(false);
});
