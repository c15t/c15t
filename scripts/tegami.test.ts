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

const roots: string[] = [];
const repository = fileURLToPath(new URL('..', import.meta.url));
const branch = 'release/v1';

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

const release = function release(root: string) {
	return createRelease({ branch, cwd: root, github: false });
};

/** The 1.8.6 dependency graph between published packages. */
const v1Workspace = function v1Workspace() {
	return fixture([
		{
			dependencies: {
				'@c15t/backend': 'workspace:*',
				'@c15t/translations': 'workspace:*',
			},
			name: 'c15t',
			version: '1.8.6',
		},
		{
			dependencies: {
				'@c15t/logger': 'workspace:*',
				'@c15t/translations': 'workspace:*',
			},
			name: '@c15t/backend',
			version: '1.8.6',
		},
		{
			dependencies: {
				'@c15t/backend': 'workspace:*',
				'@c15t/logger': 'workspace:*',
				'@c15t/react': 'workspace:*',
			},
			name: '@c15t/cli',
			version: '1.8.6',
		},
		{
			dependencies: { c15t: 'workspace:*' },
			name: '@c15t/dev-tools',
			version: '1.8.6',
		},
		{ name: '@c15t/logger', version: '1.0.1' },
		{
			dependencies: {
				'@c15t/react': 'workspace:*',
				'@c15t/translations': 'workspace:*',
			},
			devDependencies: { '@c15t/backend': 'workspace:*' },
			name: '@c15t/nextjs',
			version: '1.8.6',
		},
		{
			dependencies: { '@c15t/backend': 'workspace:*' },
			name: '@c15t/node-sdk',
			version: '1.8.6',
		},
		{
			dependencies: { c15t: 'workspace:*' },
			devDependencies: { '@c15t/backend': 'workspace:*' },
			name: '@c15t/react',
			version: '1.8.6',
		},
		{
			devDependencies: { c15t: 'workspace:*' },
			name: '@c15t/scripts',
			version: '1.0.1',
		},
		{ name: '@c15t/translations', version: '1.8.5' },
	]);
};

const versions = function versions(root: string) {
	return Object.fromEntries(
		readdirSync(join(root, 'packages')).map((directory) => {
			const manifest = readManifest(root, directory);
			return [manifest.name, manifest.version];
		})
	);
};

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

describe('release line', () => {
	it('maps release/v1 to the v1-legacy npm tag without a prerelease', () => {
		expect(releaseLine('release/v1')).toEqual({
			distTag: 'v1-legacy',
			prerelease: undefined,
		});
	});
	it.each(['main', 'canary', 'release/v2', 'feature/test', 'v1'])(
		'rejects the unsupported branch %s',
		(other) => {
			expect(() => releaseLine(other)).toThrow('Set RELEASE_BRANCH=release/v1');
		}
	);
	it.each(['1.9.0', '1.8.7', '1.0.2'])('accepts %s', (version) => {
		expect(() => checkReleaseVersion(branch, version)).not.toThrow();
	});
	it.each([
		[branch, '2.0.0'],
		[branch, '3.1.0'],
		[branch, '0.9.0'],
		[branch, '1.9.0-canary.0'],
		[branch, 'not-a-version'],
		['main', '1.9.0'],
	])('rejects %s publishing %s', (other, version) => {
		expect(() => checkReleaseVersion(other, version)).toThrow(
			'not a valid release'
		);
	});
	it.each([
		['patch', '1.8.7'],
		['minor', '1.9.0'],
		['major', '2.0.0'],
	] as const)('bumps 1.8.6 by %s to %s', (type, version) => {
		expect(nextVersion('1.8.6', type)).toBe(version);
	});
});

describe('linked versioning', () => {
	it('releases c15t and its dependents on 1.9.0 and leaves @c15t/backend alone', async () => {
		const root = v1Workspace();
		change(root, { c15t: 'minor' });
		await (await release(root).draft()).apply();
		expect(versions(root)).toEqual({
			'@c15t/backend': '1.8.6',
			'@c15t/cli': '1.9.0',
			'@c15t/dev-tools': '1.9.0',
			'@c15t/logger': '1.0.1',
			'@c15t/nextjs': '1.9.0',
			'@c15t/node-sdk': '1.8.6',
			'@c15t/react': '1.9.0',
			'@c15t/scripts': '1.0.1',
			'@c15t/translations': '1.8.5',
			c15t: '1.9.0',
		});
		expect(readManifest(root, 'react').dependencies).toEqual({
			c15t: 'workspace:*',
		});
		expect(
			readFileSync(join(root, '.tegami/publish-lock.yaml'), 'utf8')
		).toContain('distTag: v1-legacy');
		expect((await release(root).draft()).hasPending()).toBe(false);
	});

	it('does not bump @c15t/backend when a dependency of it changes', async () => {
		const root = v1Workspace();
		change(root, { '@c15t/translations': 'patch' });
		await (await release(root).draft()).apply();
		const released = versions(root);
		expect(released['@c15t/backend']).toBe('1.8.6');
		// Linked members bump from the group's highest version, 1.8.6.
		expect(released['@c15t/translations']).toBe('1.8.7');
		expect(released.c15t).toBe('1.8.7');
	});

	it('refuses a release note for @c15t/backend', async () => {
		const root = v1Workspace();
		change(root, { '@c15t/backend': 'patch' });
		await expect(
			(async () => (await release(root).draft()).apply())()
		).rejects.toThrow('@c15t/backend must not release from release/v1');
	});

	it('rejects a note that would leave the 1.x major', async () => {
		const root = v1Workspace();
		change(root, { c15t: 'major' });
		await expect(
			(async () => (await release(root).draft()).apply())()
		).rejects.toThrow('2.0.0 is not a valid release for release/v1');
	});
});

describe('publish plan validation', () => {
	it.each(['branch', 'version', 'tag', 'latest', 'missing'])(
		'rejects a mismatched %s before querying registries',
		async (kind) => {
			const root = fixture([{ name: '@c15t/logger', version: '1.0.1' }]);
			change(root, { '@c15t/logger': 'patch' });
			await (await release(root).draft()).apply();
			const path = join(root, '.tegami/publish-lock.yaml');
			let lock = readFileSync(path, 'utf8');
			if (kind === 'branch') {
				lock = lock.replace('branch: release/v1', 'branch: main');
			} else if (kind === 'version') {
				lock = lock.replace('version: 1.0.2', 'version: 1.0.3');
			} else if (kind === 'tag') {
				lock = lock.replace('distTag: v1-legacy', 'distTag: latest');
			} else if (kind === 'latest') {
				lock += '\nnpm:mark-latest:\n  - id: npm:@c15t/logger\n';
			} else {
				const data = parse(lock);
				delete data['c15t:release'];
				lock = stringify(data);
			}
			writeFileSync(path, lock);
			await expect(release(root).getPublishStatus()).rejects.toThrow(
				/Publish lock|not a valid release|Unsupported release branch/u
			);
		}
	);
});

describe('CI release retries', () => {
	it('preserves the pending release when new notes arrive', async () => {
		const root = fixture([{ name: '@c15t/logger', version: '1.0.1' }]);
		change(root, { '@c15t/logger': 'patch' }, 'original');
		await (await release(root).draft()).apply();
		const lockPath = join(root, '.tegami/publish-lock.yaml');
		const lock = readFileSync(lockPath, 'utf8');
		const pendingVersion = readManifest(root, 'logger').version;
		change(root, { '@c15t/logger': 'patch' }, 'later');
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
		expect(readManifest(root, 'logger').version).toBe(pendingVersion);
		expect(readFileSync(join(root, '.tegami/later.md'), 'utf8')).toContain(
			'Release notes for later.'
		);
	});

	it('versions new notes once the pending release is published', async () => {
		const root = fixture([{ name: '@c15t/logger', version: '1.0.1' }]);
		change(root, { '@c15t/logger': 'patch' }, 'original');
		await (await release(root).draft()).apply();
		const pendingVersion = readManifest(root, 'logger').version;
		change(root, { '@c15t/logger': 'patch' }, 'later');
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 404 })))
		);
		const instance = release(root);
		// Publishing puts the pending version on the registry; nothing uploads.
		const publish = vi.spyOn(instance, 'publish').mockImplementation(() => {
			vi.stubGlobal(
				'fetch',
				vi.fn(() =>
					Promise.resolve(
						Response.json({ versions: { [pendingVersion ?? '']: {} } })
					)
				)
			);
			return Promise.resolve('skipped');
		});
		await runReleaseCli(instance, ['ci']);
		expect(publish).toHaveBeenCalledOnce();
		expect(readManifest(root, 'logger').version).not.toBe(pendingVersion);
		expect(
			readFileSync(join(root, 'packages/logger/CHANGELOG.md'), 'utf8')
		).toContain('Release notes for later.');
	});
});

// These run Bun, Turbo and npm in subprocesses, which outlast Vitest's 5 s
// default on a slow runner.
describe('publishing through npm', { timeout: 60_000 }, () => {
	const publishFixture = function publishFixture(fail?: 'build') {
		const root = fixture([
			{ files: ['dist'], name: '@c15t/translations', version: '1.8.5' },
			{
				dependencies: { '@c15t/translations': 'workspace:*' },
				files: ['dist'],
				name: 'c15t',
				version: '1.8.6',
			},
		]);
		write(
			root,
			'package.json',
			JSON.stringify({
				name: 'fixture',
				private: true,
				scripts: {
					turbo: fail === 'build' ? 'exit 1' : 'bun build-fixture.mjs',
				},
				workspaces: ['packages/*'],
			})
		);
		write(
			root,
			'build-fixture.mjs',
			`import { mkdirSync, writeFileSync } from 'node:fs';
writeFileSync('build-scope.json', JSON.stringify(process.argv.slice(2)));
for (const name of ['c15t', 'translations']) {
 mkdirSync('packages/' + name + '/dist', { recursive: true });
 writeFileSync('packages/' + name + '/dist/index.js', 'export const built = true;');
}`
		);
		// A fake npm executable records uploads. No registry writes leave this test.
		write(
			root,
			'bin/npm',
			`#!${process.execPath}
const { appendFileSync, existsSync, readFileSync } = require('node:fs');
if (!existsSync('dist/index.js')) process.exit(1);
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
		change(root, { '@c15t/translations': 'minor' });
		// Start with an installed lockfile, as the release workflow does before
		// versioning. Bun leaves these versions stale after manifest-only updates.
		execFileSync('bun', ['install', '--ignore-scripts'], {
			cwd: root,
			stdio: 'pipe',
		});
		return root;
	};

	const publishInIsolation = function publishInIsolation(
		root: string,
		{ syncLock = true } = {}
	) {
		// tinyexec captures PATH at import time, so give it a fresh process. The
		// closed local registry is a second guard if executable resolution regresses.
		write(
			root,
			'publish-fixture.ts',
			`import { createRelease, runReleaseCli } from ${JSON.stringify(join(repository, 'scripts/tegami.ts'))};
globalThis.fetch = async () => new Response(null, { status: 404 });
await runReleaseCli(createRelease({ branch: 'release/v1', cwd: process.cwd(), github: false }), ['ci']);`
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
		// Newer Bun refreshes workspace versions on install and 1.3.11 does not,
		// so set the lock explicitly either way.
		syncBunLockVersions(
			root,
			['c15t', 'translations'].map((name) => ({
				path: join(root, 'packages', name),
				version: syncLock ? readManifest(root, name).version : '0.0.0-stale',
			}))
		);
		execFileSync('bun', ['publish-fixture.ts'], {
			cwd: root,
			env,
			stdio: 'pipe',
			timeout: 20_000,
		});
	};

	it('builds, packs workspace ranges, then invokes npm with the v1-legacy tag', async () => {
		const root = publishFixture();
		await (await release(root).draft()).apply();
		change(root, { c15t: 'patch' }, 'later');
		publishInIsolation(root);
		expect(
			JSON.parse(readFileSync(join(root, 'build-scope.json'), 'utf8')).sort()
		).toEqual(
			['run', 'build', '--filter=@c15t/translations', '--filter=c15t'].sort()
		);
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
					'v1-legacy',
				],
				name: '@c15t/translations',
				provenance: 'true',
				version: '1.9.0',
			},
			{
				args: [
					'publish',
					join(root, 'packages/c15t/pkg.tgz'),
					'--tag',
					'v1-legacy',
				],
				name: 'c15t',
				provenance: 'true',
				version: '1.9.0',
			},
		]);
		const packed: Manifest = JSON.parse(
			execFileSync(
				'tar',
				['-xOf', join(root, 'packages/c15t/pkg.tgz'), 'package/package.json'],
				{ encoding: 'utf8' }
			)
		);
		expect(packed.dependencies).toEqual({ '@c15t/translations': '1.9.0' });
		expect(readManifest(root, 'c15t').dependencies).toEqual({
			'@c15t/translations': 'workspace:*',
		});
		expect(existsSync(join(root, '.tegami/later.md'))).toBe(true);
	});

	it('blocks uploads when the build fails', async () => {
		const root = publishFixture('build');
		await (await release(root).draft()).apply();
		const lockPath = join(root, '.tegami/publish-lock.yaml');
		const lock = readFileSync(lockPath, 'utf8');
		expect(() => publishInIsolation(root)).toThrow();
		expect(existsSync(join(root, 'uploads.jsonl'))).toBe(false);
		expect(readFileSync(lockPath, 'utf8')).toBe(lock);
	});

	it('blocks uploads when bun.lock would pack stale workspace versions', async () => {
		const root = publishFixture();
		await (await release(root).draft()).apply();
		let output = '';
		try {
			publishInIsolation(root, { syncLock: false });
		} catch (error) {
			// Tegami's CLI prints the failure to stdout locally; keep stderr and
			// the error so a different failure shows its own message.
			const { message, stderr, stdout } = error as {
				message: string;
				stderr?: Buffer;
				stdout?: Buffer;
			};
			output = [stdout, stderr, message].map(String).join('\n');
		}
		expect(output).toContain('bun.lock has stale workspace versions for');
		expect(existsSync(join(root, 'uploads.jsonl'))).toBe(false);
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
			{ name: '@c15t/logger', version: '1.0.1' },
			{ name: '@c15t/scripts', version: '1.0.1' },
		]);
		change(root, { '@c15t/logger': { type: 'minor' } }, 'logger-change');
		change(root, { '@c15t/scripts': { type: 'patch' } }, 'scripts-change');

		const body = await versionPrBody(root);

		expect(body).toContain('| `@c15t/logger` | `1.0.1` | `1.1.0` |');
		expect(body).toContain(
			'- **logger-change** (`logger-change.md`): @c15t/logger'
		);
		expect(body).toContain(
			'- **scripts-change** (`scripts-change.md`): @c15t/scripts'
		);
	});

	it('drops note lines past GitHub’s size limit and says how many', async () => {
		const root = fixture([{ name: '@c15t/logger', version: '1.0.1' }]);
		// 300 notes with 200-character titles render well past 65,536 characters.
		for (let index = 0; index < 300; index += 1) {
			change(
				root,
				{ '@c15t/logger': { type: 'patch' } },
				`note-${String(index).padStart(3, '0')}-${'x'.repeat(200)}`
			);
		}

		const body = await versionPrBody(root);

		expect(body.length).toBeLessThanOrEqual(versionPrBodyLimit);
		expect(body).toMatch(/- …and \d+ more release notes\./u);
		expect(body).toContain('| `@c15t/logger` | `1.0.1` | `1.0.2` |');
	});
});

it(
	'drafts the real workspace without bumping private or frozen packages or leaving the 1.x line',
	{ timeout: 60_000 },
	async () => {
		const root = realWorkspace();
		const draft = await release(root).draft();
		const notes = readdirSync(join(root, '.tegami')).filter(
			(file) => file.endsWith('.md') && file !== 'README.md'
		);
		// Tegami silently ignores malformed note files. Check that none were lost.
		expect(draft.getChangelogs()).toHaveLength(notes.length);
		await draft.apply();
		const directories = readdirSync(join(root, 'packages'));
		for (const directory of directories) {
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
	}
);
