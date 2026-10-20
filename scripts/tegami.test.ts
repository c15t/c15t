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
	nextVersion,
	releaseLine,
	renderVersionPrBody,
	runReleaseCli,
	syncBunLockVersions,
	versionPrBodyLimit,
} from './tegami';

const branch = 'release/v2';
const roots: string[] = [];
const repository = fileURLToPath(new URL('..', import.meta.url));

interface Manifest {
	name: string;
	version?: string;
	private?: boolean;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
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

const release = function release(root: string, releaseBranch = branch) {
	return createRelease({ branch: releaseBranch, cwd: root, github: false });
};

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

describe('release line', () => {
	it('publishes release/v2 under the v2-legacy npm tag', () => {
		expect(releaseLine(branch)).toEqual({
			distTag: 'v2-legacy',
			prerelease: undefined,
		});
	});

	it.each([
		'main',
		'canary',
		'release/v1',
		'2.0.0',
		'feature/test',
	])('rejects the unsupported branch %s', (unsupported) => {
		expect(() => releaseLine(unsupported)).toThrow(
			'Set RELEASE_BRANCH=release/v2'
		);
	});

	it.each(['2.4.0', '2.3.1', '2.10.0'])('accepts %s', (version) => {
		expect(() => checkReleaseVersion(branch, version)).not.toThrow();
	});

	it.each([
		[branch, '3.0.0'],
		[branch, '1.9.0'],
		[branch, '2.4.0-canary.0'],
		[branch, 'not-a-version'],
		['main', '2.4.0'],
		['canary', '2.4.0'],
	])('rejects %s publishing %s', (releaseBranch, version) => {
		expect(() => checkReleaseVersion(releaseBranch, version)).toThrow(
			'not a valid release'
		);
	});

	it.each([
		['2.3.0', 'patch', undefined, '2.3.1'],
		['2.3.0', 'minor', undefined, '2.4.0'],
		['2.3.1', 'minor', undefined, '2.4.0'],
		['2.3.0', 'major', undefined, '3.0.0'],
		['2.3.0', 'patch', 'canary', '2.3.1-canary.0'],
		['2.3.1-canary.0', 'minor', 'canary', '2.4.0-canary.0'],
		['2.4.0-canary.0', 'minor', 'canary', '2.4.0-canary.1'],
	] as const)('bumps %s by %s (%s) to %s', (version, type, tag, expected) => {
		expect(nextVersion(version, type, tag)).toBe(expected);
	});
});

describe('linked and independent versioning', () => {
	const workspace = function workspace() {
		return fixture([
			{
				dependencies: { '@c15t/translations': 'workspace:*' },
				name: 'c15t',
				version: '2.3.0',
			},
			{ name: '@c15t/translations', version: '2.3.0' },
			{ name: '@c15t/logger', version: '2.1.1' },
			{
				dependencies: {
					'@c15t/logger': 'workspace:*',
					'@c15t/translations': 'workspace:*',
				},
				name: '@c15t/backend',
				version: '2.3.0',
			},
			{
				dependencies: { c15t: 'workspace:*' },
				name: '@c15t/ui',
				version: '2.2.2',
			},
			{
				dependencies: { '@c15t/ui': 'workspace:*', c15t: 'workspace:*' },
				devDependencies: { '@c15t/backend': 'workspace:*' },
				name: '@c15t/react',
				version: '2.3.0',
			},
			{ name: '@c15t/cli', version: '2.3.0' },
			{
				dependencies: { c15t: 'workspace:*' },
				name: '@c15t/private',
				private: true,
				version: '1.0.0',
			},
		]);
	};

	it('releases a minor c15t note with its dependents and leaves the rest alone', async () => {
		const root = workspace();
		change(root, { c15t: 'minor' });
		await (await release(root).draft()).apply();
		expect(readManifest(root, 'c15t').version).toBe('2.4.0');
		expect(readManifest(root, 'react').version).toBe('2.4.0');
		// Independent dependents take a patch for the new exact c15t version.
		expect(readManifest(root, 'ui').version).toBe('2.2.3');
		expect(readManifest(root, 'translations').version).toBe('2.3.0');
		expect(readManifest(root, 'backend').version).toBe('2.3.0');
		expect(readManifest(root, 'cli').version).toBe('2.3.0');
		expect(readManifest(root, 'private').version).toBe('1.0.0');
		expect(readManifest(root, 'react').dependencies).toEqual({
			'@c15t/ui': 'workspace:*',
			c15t: 'workspace:*',
		});
		expect(
			readFileSync(join(root, '.tegami/publish-lock.yaml'), 'utf8')
		).toContain('distTag: v2-legacy');
		expect((await release(root).draft()).hasPending()).toBe(false);
	});

	it('never bumps @c15t/backend for a dependency update', async () => {
		const root = workspace();
		change(root, { '@c15t/logger': 'patch', '@c15t/translations': 'patch' });
		await (await release(root).draft()).apply();
		expect(readManifest(root, 'translations').version).toBe('2.3.1');
		expect(readManifest(root, 'logger').version).toBe('2.1.2');
		expect(readManifest(root, 'c15t').version).toBe('2.3.1');
		expect(readManifest(root, 'backend').version).toBe('2.3.0');
	});

	it('rejects a release note that names @c15t/backend', async () => {
		const root = workspace();
		change(root, { '@c15t/backend': 'patch' });
		await expect(release(root).draft()).rejects.toThrow(
			'@c15t/backend does not release from release/v2'
		);
		expect(readManifest(root, 'backend').version).toBe('2.3.0');
	});

	it('rejects a major note that would leave the 2.x line', async () => {
		const root = workspace();
		change(root, { c15t: 'major' });
		await expect(
			(async () => (await release(root).draft()).apply())()
		).rejects.toThrow('3.0.0 is not a valid release for release/v2');
	});

	it('uses the highest linked bump regardless of changelog order', async () => {
		const root = fixture([
			{ name: 'c15t', version: '2.3.0' },
			{ name: '@c15t/cli', version: '2.3.0' },
			{ name: '@c15t/translations', version: '2.3.0' },
		]);
		change(root, { '@c15t/cli': 'patch', c15t: 'minor' });
		await (await release(root).draft()).apply();
		expect(readManifest(root, 'c15t').version).toBe('2.4.0');
		expect(readManifest(root, 'cli').version).toBe('2.4.0');
		expect(readManifest(root, 'translations').version).toBe('2.3.0');
	});
});

describe('publish plan validation', () => {
	it.each([
		'branch',
		'version',
		'tag',
		'latest',
		'missing',
	])('rejects a mismatched %s before querying registries', async (kind) => {
		const root = fixture([{ name: 'c15t', version: '2.3.0' }]);
		change(root, { c15t: 'patch' });
		await (await release(root).draft()).apply();
		const path = join(root, '.tegami/publish-lock.yaml');
		let lock = readFileSync(path, 'utf8');
		if (kind === 'branch') {
			lock = lock.replace('branch: release/v2', 'branch: main');
		} else if (kind === 'version') {
			lock = lock.replace('version: 2.3.1', 'version: 2.3.2');
		} else if (kind === 'tag') {
			lock = lock.replace('distTag: v2-legacy', 'distTag: latest');
		} else if (kind === 'latest') {
			lock += '\nnpm:mark-latest:\n  - id: npm:c15t\n';
		} else {
			const data = parse(lock);
			delete data['c15t:release'];
			lock = stringify(data);
		}
		writeFileSync(path, lock);
		await expect(release(root).getPublishStatus()).rejects.toThrow(
			/Publish lock|not a valid release|Unsupported release branch/u
		);
	});
});

describe('CI release retries', () => {
	it('preserves the pending release when new notes arrive', async () => {
		const root = fixture([{ name: 'c15t', version: '2.3.0' }]);
		change(root, { c15t: 'patch' }, 'original');
		await (await release(root).draft()).apply();
		const lockPath = join(root, '.tegami/publish-lock.yaml');
		const lock = readFileSync(lockPath, 'utf8');
		const pendingVersion = readManifest(root, 'c15t').version;
		change(root, { c15t: 'patch' }, 'later');
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 404 })))
		);
		const instance = release(root);
		// Exercise CLI dispatch without uploading the fixture to a registry.
		const publish = vi.spyOn(instance, 'publish').mockResolvedValue('skipped');
		await runReleaseCli(instance, ['ci']);
		expect(publish).toHaveBeenCalledOnce();
		expect(readFileSync(lockPath, 'utf8')).toBe(lock);
		expect(readManifest(root, 'c15t').version).toBe(pendingVersion);
		expect(readFileSync(join(root, '.tegami/later.md'), 'utf8')).toContain(
			'Release notes for later.'
		);
	});
});

describe('publishing through npm', () => {
	const publishFixture = function publishFixture(fail?: 'build' | 'artifacts') {
		const root = fixture([
			{ files: ['dist'], name: '@c15t/translations', version: '2.3.0' },
			{
				dependencies: { '@c15t/translations': 'workspace:*' },
				files: ['dist'],
				name: 'c15t',
				version: '2.3.0',
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
for (const name of ['c15t', 'translations']) {
 mkdirSync('packages/' + name + '/dist', { recursive: true });
 writeFileSync('packages/' + name + '/dist/index.js', 'export const built = true;');
}`
		);
		write(
			root,
			'check-fixture.mjs',
			`import { existsSync, writeFileSync } from 'node:fs';
if (!existsSync('packages/c15t/dist/index.js')) process.exit(1);
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
		change(root, { '@c15t/translations': 'patch' });
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
await runReleaseCli(createRelease({ branch: ${JSON.stringify(branch)}, cwd: process.cwd(), github: false }), ['ci']);`
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
			['c15t', 'translations'].map((name) => ({
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

	it('builds and checks artifacts, packs workspace ranges, then invokes npm with the v2-legacy tag', async () => {
		const root = publishFixture();
		await (await release(root).draft()).apply();
		change(root, { c15t: 'patch' }, 'later');
		publishInIsolation(root);
		expect(readFileSync(join(root, 'artifacts-checked'), 'utf8')).toBe('ok');
		const uploads = readFileSync(join(root, 'uploads.jsonl'), 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		expect(uploads).toEqual([
			{
				args: [
					'publish',
					join(root, 'packages/translations/pkg.tgz'),
					'--tag',
					'v2-legacy',
				],
				name: '@c15t/translations',
				provenance: 'true',
				version: '2.3.1',
			},
			{
				args: [
					'publish',
					join(root, 'packages/c15t/pkg.tgz'),
					'--tag',
					'v2-legacy',
				],
				name: 'c15t',
				provenance: 'true',
				version: '2.3.1',
			},
		]);
		const packed: Manifest = JSON.parse(
			execFileSync(
				'tar',
				['-xOf', join(root, 'packages/c15t/pkg.tgz'), 'package/package.json'],
				{ encoding: 'utf8' }
			)
		);
		// Bun resolves workspace ranges in the tarball; the manifest keeps them.
		expect(packed.dependencies).toEqual({ '@c15t/translations': '2.3.1' });
		expect(readManifest(root, 'c15t').dependencies).toEqual({
			'@c15t/translations': 'workspace:*',
		});
		expect(existsSync(join(root, '.tegami/later.md'))).toBe(true);
	});

	it.each([
		'build',
		'artifacts',
	] as const)('blocks uploads when %s fails', async (step) => {
		const root = publishFixture(step);
		await (await release(root).draft()).apply();
		const lockPath = join(root, '.tegami/publish-lock.yaml');
		const lock = readFileSync(lockPath, 'utf8');
		change(root, { c15t: 'patch' }, 'later');
		expect(() => publishInIsolation(root)).toThrow();
		expect(existsSync(join(root, 'uploads.jsonl'))).toBe(false);
		expect(readFileSync(lockPath, 'utf8')).toBe(lock);
		expect(existsSync(join(root, '.tegami/later.md'))).toBe(true);
	});

	it('dry runs validate without building or invoking npm', async () => {
		const root = publishFixture('build');
		await (await release(root).draft()).apply();
		await release(root).publish({ dryRun: true });
		expect(existsSync(join(root, 'packages/c15t/dist'))).toBe(false);
		expect(existsSync(join(root, 'uploads.jsonl'))).toBe(false);
	});
});

const realWorkspace = function realWorkspace() {
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
	return root;
};

const versionPrBody = async function versionPrBody(root: string) {
	const tegami = release(root);
	const { graph } = await tegami._internal.context();
	const previous = new Map(
		graph.getPackages().map((pkg) => [pkg.id, pkg.version])
	);
	const draft = await tegami.draft();
	await draft.apply();
	return renderVersionPrBody(graph, {
		draft,
		getPreviousVersion: (id) => previous.get(id),
		plan: undefined,
	});
};

describe('version PR body', () => {
	it('lists each bumped version and release note', async () => {
		const root = fixture([
			{ name: 'c15t', version: '2.3.0' },
			{ name: '@c15t/logger', version: '2.1.1' },
		]);
		change(root, { c15t: { type: 'minor' } }, 'core-change');
		change(root, { '@c15t/logger': { type: 'patch' } }, 'logger-change');

		const body = await versionPrBody(root);

		expect(body).toContain('| `c15t` | `2.3.0` | `2.4.0` |');
		expect(body).toContain('- **core-change** (`core-change.md`): c15t');
		expect(body).toContain(
			'- **logger-change** (`logger-change.md`): @c15t/logger'
		);
	});

	it('drops note lines past GitHub’s size limit and says how many', async () => {
		const root = fixture([{ name: 'c15t', version: '2.3.0' }]);
		// 300 notes with 200-character titles render well past 65,536 characters.
		for (let index = 0; index < 300; index += 1) {
			change(
				root,
				{ c15t: { type: 'patch' } },
				`note-${String(index).padStart(3, '0')}-${'x'.repeat(200)}`
			);
		}

		const body = await versionPrBody(root);

		expect(body.length).toBeLessThanOrEqual(versionPrBodyLimit);
		expect(body).toMatch(/- …and \d+ more release notes\./u);
		expect(body).toContain('| `c15t` | `2.3.0` | `2.3.1` |');
	});
});

describe('the real workspace', () => {
	it('drafts pending notes without bumping private packages or leaving 2.x', async () => {
		const root = realWorkspace();
		const draft = await release(root).draft();
		const notes = readdirSync(join(root, '.tegami')).filter(
			(file) => file.endsWith('.md') && file !== 'README.md'
		);
		// Tegami silently ignores malformed note files. Check that none were lost.
		expect(draft.getChangelogs()).toHaveLength(notes.length);
		await draft.apply();
		for (const directory of readdirSync(join(root, 'packages'))) {
			const manifest = readManifest(root, directory);
			const original = readManifest(repository, directory);
			if (manifest.private || manifest.name === '@c15t/backend') {
				expect(manifest.version).toBe(original.version);
			} else if (manifest.version !== original.version) {
				expect(() =>
					checkReleaseVersion(branch, manifest.version ?? '')
				).not.toThrow();
			}
		}
		expect((await release(root).draft()).hasPending()).toBe(false);
	});

	it('releases a minor c15t note with its dependents and without @c15t/backend', async () => {
		const root = realWorkspace();
		for (const file of readdirSync(join(root, '.tegami'))) {
			if (file !== 'README.md') {
				rmSync(join(root, '.tegami', file));
			}
		}
		change(root, { c15t: 'minor' });
		await (await release(root).draft()).apply();
		const bumped = Object.fromEntries(
			readdirSync(join(root, 'packages')).flatMap((directory) => {
				const manifest = readManifest(root, directory);
				const original = readManifest(repository, directory);
				return manifest.version === original.version
					? []
					: [[manifest.name, manifest.version]];
			})
		);
		const linked = Object.keys(bumped).filter((name) => name !== '@c15t/ui');
		for (const name of linked) {
			expect(bumped[name]).toBe(
				nextVersion(readManifest(repository, 'core').version ?? '', 'minor')
			);
		}
		expect(Object.keys(bumped).sort()).toEqual([
			'@c15t/dev-tools',
			'@c15t/iab',
			'@c15t/nextjs',
			'@c15t/react',
			'@c15t/ui',
			'c15t',
		]);
		expect(
			readFileSync(join(root, '.tegami/publish-lock.yaml'), 'utf8')
		).toContain('distTag: v2-legacy');
	});
});
