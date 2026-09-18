import { execFileSync } from 'node:child_process';
import {
	chmodSync,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, stringify } from 'yaml';

import {
	checkReleaseVersion,
	createRelease,
	releaseLine,
	runReleaseCli,
	syncBunLockVersions,
} from './tegami';

const roots: string[] = [];
const repository = fileURLToPath(new URL('..', import.meta.url));
const commit = 'a'.repeat(40);

interface Manifest {
	name: string;
	version?: string;
	private?: boolean;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	files?: string[];
	scripts?: Record<string, string>;
}

const write = function write(root: string, path: string, content: string) {
	mkdirSync(dirname(join(root, path)), { recursive: true });
	writeFileSync(join(root, path), content);
};

const fixture = function fixture(manifests: Manifest[]) {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'c15t-tegami-')));
	roots.push(root);
	write(
		root,
		'package.json',
		JSON.stringify({
			name: 'fixture',
			private: true,
			workspaces: ['packages/*'],
		})
	);
	for (const manifest of manifests) {
		write(
			root,
			`packages/${manifest.name.replace('@c15t/', '')}/package.json`,
			JSON.stringify(manifest)
		);
	}
	return root;
};

const change = function change(
	root: string,
	packages: Record<string, unknown>,
	name = 'change'
) {
	write(
		root,
		`.tegami/${name}.md`,
		`---\n${stringify({ packages })}---\n\n### ${name}\n\nRelease notes for ${name}.\n`
	);
};

const readManifest = function readManifest(
	root: string,
	name: string
): Manifest {
	return JSON.parse(
		readFileSync(join(root, `packages/${name}/package.json`), 'utf8')
	);
};

const release = function release(root: string, branch = 'v3') {
	return createRelease({ branch, commit, cwd: root, github: false });
};

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

describe('release channels', () => {
	it.each([
		['main', 'latest', undefined],
		['v3', 'alpha', 'alpha'],
		['2.0.0', 'rc', 'rc'],
		['canary', 'canary', `canary-${commit}`],
	])('maps %s to the %s npm tag', (branch, distTag, prerelease) => {
		expect(releaseLine(branch, commit)).toEqual({ distTag, prerelease });
	});
	it('rejects unknown branches and missing snapshot identities', () => {
		expect(() => releaseLine('feature/test')).toThrow(
			'Unsupported release branch'
		);
		expect(() => releaseLine('canary')).toThrow('commit SHA');
	});
	it.each([
		['v3', '3.0.0'],
		['v3', '4.0.0-alpha.0'],
		['v3', '3.0.0-rc.0'],
		['main', '3.0.0-alpha.1'],
		['2.0.0', '3.0.0'],
		['canary', '3.0.0'],
	])('rejects %s publishing %s', (branch, version) => {
		expect(() => checkReleaseVersion(branch, version)).toThrow(
			'not a valid release'
		);
	});
});

describe('linked and independent versioning', () => {
	it('aligns selected packages with the highest linked alpha and bumps dependents', async () => {
		const root = fixture([
			{ name: '@c15t/core', version: '3.0.0-alpha.1' },
			{ name: '@c15t/backend', version: '3.0.0-alpha.5' },
			{ name: '@c15t/translations', version: '3.0.0-alpha.0' },
			{ name: '@c15t/logger', version: '3.0.0-alpha.0' },
			{
				dependencies: { '@c15t/core': 'workspace:*' },
				name: '@c15t/react',
				version: '3.0.0-alpha.1',
			},
			{
				dependencies: { '@c15t/core': 'workspace:*' },
				name: '@c15t/private',
				private: true,
				version: '1.0.0',
			},
		]);
		change(root, { '@c15t/core': 'patch', '@c15t/logger': 'patch' });
		await (await release(root).draft()).apply();
		expect(readManifest(root, 'core').version).toBe('3.0.0-alpha.6');
		expect(readManifest(root, 'react').version).toBe('3.0.0-alpha.6');
		expect(readManifest(root, 'backend').version).toBe('3.0.0-alpha.5');
		expect(readManifest(root, 'translations').version).toBe('3.0.0-alpha.0');
		expect(readManifest(root, 'logger').version).toBe('3.0.0-alpha.1');
		expect(readManifest(root, 'private').version).toBe('1.0.0');
		expect(readManifest(root, 'react').dependencies).toEqual({
			'@c15t/core': 'workspace:*',
		});
		expect((await release(root).draft()).hasPending()).toBe(false);
		change(root, { '@c15t/translations': 'major' }, 'next-alpha');
		await (await release(root).draft()).apply();
		expect(readManifest(root, 'translations').version).toBe('3.0.0-alpha.7');
	});

	it('uses the highest stable bump regardless of changelog order', async () => {
		const root = fixture([
			{ name: '@c15t/core', version: '3.1.0' },
			{ name: '@c15t/backend', version: '3.2.0' },
			{ name: '@c15t/translations', version: '3.0.0' },
		]);
		change(root, { '@c15t/backend': 'minor', '@c15t/core': 'patch' });
		await (await release(root, 'main').draft()).apply();
		expect(readManifest(root, 'core').version).toBe('3.3.0');
		expect(readManifest(root, 'backend').version).toBe('3.3.0');
		expect(readManifest(root, 'translations').version).toBe('3.0.0');
	});

	it('updates out-of-range peer dependencies and releases the dependent', async () => {
		const root = fixture([
			{ name: '@c15t/ui', version: '3.0.0' },
			{
				name: '@c15t/react',
				peerDependencies: { '@c15t/ui': '^3.0.0' },
				version: '3.0.0',
			},
		]);
		change(root, { '@c15t/ui': 'major' });
		await (await release(root, 'main').draft()).apply();
		expect(readManifest(root, 'react')).toMatchObject({
			peerDependencies: { '@c15t/ui': '4.0.0' },
			version: '4.0.0',
		});
	});
});

describe('prereleases and migrated notes', () => {
	it('keeps consumed notes without another alpha bump and replays them at stable', async () => {
		const root = fixture([{ name: '@c15t/core', version: '3.0.0-alpha.1' }]);
		change(
			root,
			{ '@c15t/core': { replay: ['exit-prerelease(@c15t/core)'] } },
			'already-released'
		);
		expect((await release(root).draft()).hasPending()).toBe(false);
		change(root, { '@c15t/core': 'patch' }, 'new-fix');
		await (await release(root).draft()).apply();
		expect(readManifest(root, 'core').version).toBe('3.0.0-alpha.2');
		const alphaLog = readFileSync(
			join(root, 'packages/core/CHANGELOG.md'),
			'utf8'
		);
		expect(alphaLog).toContain('new-fix');
		expect(alphaLog).not.toContain('already-released');
		await (await release(root, 'main').draft()).apply();
		expect(readManifest(root, 'core').version).toBe('3.0.0');
		const stableLog = readFileSync(
			join(root, 'packages/core/CHANGELOG.md'),
			'utf8'
		);
		expect(stableLog.split('## 3.0.0-alpha.2')[0]).toContain(
			'already-released'
		);
		expect(stableLog).toContain('new-fix');
		expect(existsSync(join(root, '.tegami/already-released.md'))).toBe(false);
		expect((await release(root, 'main').draft()).hasPending()).toBe(false);
	});

	it('advances RCs without moving to latest', async () => {
		const root = fixture([{ name: '@c15t/core', version: '2.0.0-rc.4' }]);
		change(root, { '@c15t/core': 'minor' });
		await (await release(root, '2.0.0').draft()).apply();
		expect(readManifest(root, 'core').version).toBe('2.0.0-rc.5');
		expect(
			readFileSync(join(root, '.tegami/publish-lock.yaml'), 'utf8')
		).toContain('distTag: rc');
	});

	it('creates repeatable canary snapshots unique to each commit', async () => {
		const manifests = [{ name: '@c15t/core', version: '3.0.0-alpha.1' }];
		const root = fixture(manifests);
		const retry = fixture(manifests);
		const next = fixture(manifests);
		await (await release(root, 'canary').draft()).apply();
		await (await release(retry, 'canary').draft()).apply();
		await (
			await createRelease({
				branch: 'canary',
				commit: 'b'.repeat(40),
				cwd: next,
				github: false,
			}).draft()
		).apply();
		expect(readManifest(root, 'core').version).toBe(`3.0.0-canary-${commit}.0`);
		expect(readManifest(retry, 'core').version).toBe(
			readManifest(root, 'core').version
		);
		expect(readManifest(next, 'core').version).not.toBe(
			readManifest(root, 'core').version
		);
		expect(
			readFileSync(join(root, '.tegami/publish-lock.yaml'), 'utf8')
		).toContain('distTag: canary');
	});

	it('snapshots every public package from a stable baseline without pending notes', async () => {
		const root = fixture([
			{ name: '@c15t/core', version: '3.0.0' },
			{ name: '@c15t/logger', version: '2.1.0' },
			{ name: '@c15t/private', private: true, version: '1.0.0' },
		]);
		await (await release(root, 'canary').draft()).apply();
		expect(readManifest(root, 'core').version).toBe(`3.0.1-canary-${commit}.0`);
		expect(readManifest(root, 'logger').version).toBe(
			`2.1.1-canary-${commit}.0`
		);
		expect(readManifest(root, 'private').version).toBe('1.0.0');
	});
});

describe('publish plan validation', () => {
	it.each(['branch', 'version', 'tag', 'latest', 'missing'])(
		'rejects a mismatched %s before querying registries',
		async (kind) => {
			const root = fixture([{ name: '@c15t/core', version: '3.0.0-alpha.1' }]);
			change(root, { '@c15t/core': 'patch' });
			await (await release(root).draft()).apply();
			const path = join(root, '.tegami/publish-lock.yaml');
			let lock = readFileSync(path, 'utf8');
			if (kind === 'branch') {
				lock = lock.replace('branch: v3', 'branch: main');
			} else if (kind === 'version') {
				lock = lock.replace('version: 3.0.0-alpha.2', 'version: 3.0.0-alpha.3');
			} else if (kind === 'tag') {
				lock = lock.replace('distTag: alpha', 'distTag: latest');
			} else if (kind === 'latest') {
				lock += '\nnpm:mark-latest:\n  - id: npm:@c15t/core\n';
			} else {
				const data = parse(lock);
				delete data['c15t:release'];
				lock = stringify(data);
			}
			writeFileSync(path, lock);
			await expect(release(root).getPublishStatus()).rejects.toThrow(
				/Publish lock|not a valid release/u
			);
		}
	);

	it('allows a completed alpha lock to be inspected before stable graduation', async () => {
		const root = fixture([{ name: '@c15t/core', version: '3.0.0-alpha.1' }]);
		change(root, { '@c15t/core': 'patch' });
		await (await release(root).draft()).apply();
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve(Response.json({ versions: { '3.0.0-alpha.2': {} } }))
			)
		);
		expect((await release(root, 'main').getPublishStatus()).status).toBe(
			'success'
		);
		await (await release(root, 'main').draft()).apply();
		expect(readManifest(root, 'core').version).toBe('3.0.0');
	});

	it('refuses to publish an unfinished alpha lock on main, including dry runs', async () => {
		const root = fixture([{ name: '@c15t/core', version: '3.0.0-alpha.1' }]);
		change(root, { '@c15t/core': 'patch' });
		await (await release(root).draft()).apply();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 404 })))
		);
		await expect(
			release(root, 'main').publish({ dryRun: true })
		).rejects.toThrow('does not belong to main');
	});
});

describe('CI release retries', () => {
	it.each([
		['main', '1.0.0'],
		['v3', '3.0.0-alpha.1'],
		['2.0.0', '2.0.0-rc.1'],
	])(
		'preserves the pending %s release when new notes arrive',
		async (branch, version) => {
			const root = fixture([{ name: '@c15t/core', version }]);
			change(root, { '@c15t/core': 'patch' }, 'original');
			await (await release(root, branch).draft()).apply();
			const lockPath = join(root, '.tegami/publish-lock.yaml');
			const lock = readFileSync(lockPath, 'utf8');
			const pendingVersion = readManifest(root, 'core').version;
			change(root, { '@c15t/core': 'patch' }, 'later');
			vi.stubGlobal(
				'fetch',
				vi.fn(() => Promise.resolve(new Response(null, { status: 404 })))
			);
			const instance = release(root, branch);
			// Exercise CLI dispatch without uploading the fixture to a registry.
			const publish = vi
				.spyOn(instance, 'publish')
				.mockResolvedValue('skipped');
			await runReleaseCli(instance, ['ci']);
			expect(publish).toHaveBeenCalledOnce();
			expect(readFileSync(lockPath, 'utf8')).toBe(lock);
			expect(readManifest(root, 'core').version).toBe(pendingVersion);
			expect(readFileSync(join(root, '.tegami/later.md'), 'utf8')).toContain(
				'Release notes for later.'
			);
		}
	);
});

describe('publishing through npm', () => {
	const publishFixture = function publishFixture(fail?: 'build' | 'artifacts') {
		const root = fixture([
			{ files: ['dist'], name: '@c15t/logger', version: '3.0.0-alpha.0' },
			{
				dependencies: { '@c15t/logger': 'workspace:*' },
				files: ['dist'],
				name: '@c15t/core',
				version: '3.0.0-alpha.1',
			},
		]);
		write(
			root,
			'package.json',
			JSON.stringify({
				name: 'fixture',
				private: true,
				scripts: {
					'build:libs': fail === 'build' ? 'exit 1' : 'bun build-fixture.mjs',
					'check:publish-artifacts':
						fail === 'artifacts' ? 'exit 1' : 'bun check-fixture.mjs',
				},
				workspaces: ['packages/*'],
			})
		);
		write(
			root,
			'build-fixture.mjs',
			`import { mkdirSync, writeFileSync } from 'node:fs';
for (const name of ['core', 'logger']) {
 mkdirSync('packages/' + name + '/dist', { recursive: true });
 writeFileSync('packages/' + name + '/dist/index.js', 'export const built = true;');
}`
		);
		write(
			root,
			'check-fixture.mjs',
			`import { existsSync, writeFileSync } from 'node:fs';
if (!existsSync('packages/core/dist/index.js')) process.exit(1);
writeFileSync('artifacts-checked', 'ok');`
		);
		// A fake npm executable records uploads. No registry writes leave this test.
		write(
			root,
			'bin/npm',
			`#!${process.execPath}
const { appendFileSync, existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
if (!existsSync(resolve('../../artifacts-checked'))) process.exit(1);
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
appendFileSync(process.env.C15T_PUBLISH_LOG, JSON.stringify({ args: process.argv.slice(2), name: manifest.name, provenance: process.env.NPM_CONFIG_PROVENANCE, version: manifest.version }) + '\\n');
`
		);
		chmodSync(join(root, 'bin/npm'), 0o755);
		write(root, '.npmrc', 'registry=http://127.0.0.1:1\n');
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 404 })))
		);
		change(root, { '@c15t/logger': 'patch' });
		// Start with an installed lockfile, as the release workflow does before
		// versioning. Bun leaves these versions stale after manifest-only updates.
		execFileSync('bun', ['install', '--ignore-scripts'], {
			cwd: root,
			stdio: 'pipe',
		});
		return root;
	};

	const publishInIsolation = function publishInIsolation(root: string) {
		// tinyexec captures PATH at import time, so give it a fresh process. The
		// closed local registry is a second guard if executable resolution regresses.
		write(
			root,
			'publish-fixture.ts',
			`import { createRelease, runReleaseCli } from ${JSON.stringify(join(repository, 'scripts/tegami.ts'))};
globalThis.fetch = async () => new Response(null, { status: 404 });
await runReleaseCli(createRelease({ branch: 'v3', cwd: process.cwd(), github: false }), ['ci']);`
		);
		const env = {
			...process.env,
			C15T_PUBLISH_LOG: join(root, 'uploads.jsonl'),
			NPM_CONFIG_PROVENANCE: 'true',
			NPM_CONFIG_REGISTRY: 'http://127.0.0.1:1',
			PATH: `${join(root, 'bin')}:${process.env.PATH}`,
		};
		execFileSync('bun', ['install', '--ignore-scripts'], {
			cwd: root,
			env,
			stdio: 'pipe',
		});
		syncBunLockVersions(
			root,
			['core', 'logger'].map((name) => ({
				path: join(root, 'packages', name),
				version: readManifest(root, name).version,
			}))
		);
		execFileSync('bun', ['publish-fixture.ts'], {
			cwd: root,
			env,
			stdio: 'pipe',
			timeout: 10_000,
		});
	};

	it('builds and checks artifacts, packs workspace ranges, then invokes npm with the channel tag', async () => {
		const root = publishFixture();
		await (await release(root).draft()).apply();
		change(root, { '@c15t/core': 'patch' }, 'later');
		expect(readFileSync(join(root, 'bun.lock'), 'utf8')).toContain(
			'3.0.0-alpha.0'
		);
		publishInIsolation(root);
		expect(readFileSync(join(root, 'bun.lock'), 'utf8')).not.toContain(
			'3.0.0-alpha.0'
		);
		const uploads = readFileSync(join(root, 'uploads.jsonl'), 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		expect(uploads).toEqual([
			{
				args: [
					'publish',
					join(root, 'packages/logger/pkg.tgz'),
					'--tag',
					'alpha',
				],
				name: '@c15t/logger',
				provenance: 'true',
				version: '3.0.0-alpha.1',
			},
			{
				args: [
					'publish',
					join(root, 'packages/core/pkg.tgz'),
					'--tag',
					'alpha',
				],
				name: '@c15t/core',
				provenance: 'true',
				version: '3.0.0-alpha.2',
			},
		]);
		const packed: Manifest = JSON.parse(
			execFileSync(
				'tar',
				['-xOf', join(root, 'packages/core/pkg.tgz'), 'package/package.json'],
				{ encoding: 'utf8' }
			)
		);
		expect(packed.dependencies).toEqual({ '@c15t/logger': '3.0.0-alpha.1' });
		expect(readManifest(root, 'core').dependencies).toEqual({
			'@c15t/logger': 'workspace:*',
		});
		expect(existsSync(join(root, '.tegami/later.md'))).toBe(true);
	});

	it.each(['build', 'artifacts'] as const)(
		'blocks uploads when %s fails',
		async (step) => {
			const root = publishFixture(step);
			await (await release(root).draft()).apply();
			const lockPath = join(root, '.tegami/publish-lock.yaml');
			const lock = readFileSync(lockPath, 'utf8');
			change(root, { '@c15t/core': 'patch' }, 'later');
			expect(() => publishInIsolation(root)).toThrow();
			expect(existsSync(join(root, 'uploads.jsonl'))).toBe(false);
			expect(readFileSync(lockPath, 'utf8')).toBe(lock);
			expect(existsSync(join(root, '.tegami/later.md'))).toBe(true);
		}
	);

	it('dry runs validate without building or invoking npm', async () => {
		const root = publishFixture('build');
		await (await release(root).draft()).apply();
		await release(root).publish({ dryRun: true });
		expect(existsSync(join(root, 'packages/core/dist'))).toBe(false);
		expect(existsSync(join(root, 'uploads.jsonl'))).toBe(false);
	});
});

it('drafts the real workspace without bumping private packages or leaving alpha', async () => {
	const root = fixture([]);
	cpSync(join(repository, '.tegami'), join(root, '.tegami'), {
		recursive: true,
	});
	for (const directory of readdirSync(join(repository, 'packages'))) {
		const manifest = join(repository, 'packages', directory, 'package.json');
		if (existsSync(manifest)) {
			write(
				root,
				`packages/${directory}/package.json`,
				readFileSync(manifest, 'utf8')
			);
		}
	}
	const draft = await release(root).draft();
	const notes = readdirSync(join(root, '.tegami')).filter(
		(file) => file.endsWith('.md') && file !== 'README.md'
	);
	// Tegami silently ignores malformed note files. Check that none were lost.
	expect(draft.getChangelogs()).toHaveLength(notes.length);
	await draft.apply();
	const manifests = readdirSync(join(root, 'packages')).map((directory) =>
		readManifest(root, directory)
	);
	for (const manifest of manifests.filter((pkg) => pkg.private)) {
		expect(manifest.version).toBeUndefined();
	}
	for (const manifest of manifests.filter((pkg) => !pkg.private)) {
		expect(manifest.version).toMatch(/^3\.0\.0-alpha\.\d+$/u);
	}
	expect((await release(root).draft()).hasPending()).toBe(false);
});
