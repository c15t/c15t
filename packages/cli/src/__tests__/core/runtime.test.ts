import {
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
	vi.unstubAllEnvs();
	rmSync(root, { force: true, recursive: true });
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
it.each(['edited', 'identical replacement'])(
	'preserves all files when recovery finds an %s',
	(change) => {
		const stage = interrupted();
		const target = join(root, 'README.c15t.md');
		if (change === 'identical replacement') {
			unlinkSync(target);
		}
		writeFileSync(
			target,
			change === 'edited' ? 'user changes' : generation.files['README.c15t.md']
		);
		expect(() => recoverGeneration(root)).toThrow('changed since apply');
		expect(existsSync(join(root, 'src/privacy.ts'))).toBe(true);
		expect(existsSync(stage)).toBe(true);
	}
);
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
