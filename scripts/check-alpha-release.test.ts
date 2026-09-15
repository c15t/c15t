import { execFileSync } from 'node:child_process';
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { checkAlphaRelease } from './check-alpha-release';
import { withAlphaPublishState } from './publish-alpha';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const changesetBin = join(
	dirname(dirname(require.resolve('@changesets/cli'))),
	'bin.js'
);
const temporaryDirectories: string[] = [];

const fixture = function fixture(version = '3.0.0-alpha.0'): string {
	const root = mkdtempSync(join(tmpdir(), 'c15t-alpha-'));
	temporaryDirectories.push(root);
	mkdirSync(join(root, '.changeset'));
	mkdirSync(join(root, 'packages/core'), { recursive: true });
	writeFileSync(
		join(root, '.changeset/pre.json'),
		JSON.stringify({ mode: 'pre', tag: 'alpha' })
	);
	writeFileSync(
		join(root, 'packages/core/package.json'),
		JSON.stringify({ name: '@c15t/core', version })
	);
	return root;
};

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

describe('alpha publish checks', () => {
	it('accepts v3 alphas and excludes private packages', () => {
		const root = fixture();
		mkdirSync(join(root, 'packages/solid'));
		writeFileSync(
			join(root, 'packages/solid/package.json'),
			JSON.stringify({ name: '@c15t/solid', private: true })
		);
		expect(() => checkAlphaRelease(root)).not.toThrow();
	});

	it.each([
		'2.2.0',
		'3.0.0',
		'3.0.0-rc.0',
		'2.2.0-canary-20260731105620',
		'4.0.0-alpha.0',
	])('refuses to publish %s through the alpha channel', (version) => {
		expect(() => checkAlphaRelease(fixture(version))).toThrow(
			'expected a v3 alpha'
		);
	});

	it('allows the 2.x baseline only before versioning', () => {
		const root = fixture('2.2.0');
		expect(() => checkAlphaRelease(root, true)).not.toThrow();
		expect(() => checkAlphaRelease(root)).toThrow('expected a v3 alpha');
	});

	it.each([
		{ mode: 'exit', tag: 'alpha' },
		{ mode: 'pre', tag: 'rc' },
	])('rejects prerelease state %j', (pre) => {
		const root = fixture();
		writeFileSync(join(root, '.changeset/pre.json'), JSON.stringify(pre));
		expect(() => checkAlphaRelease(root)).toThrow(
			'active Changesets alpha mode'
		);
	});

	it('rejects missing prerelease state', () => {
		const root = fixture();
		rmSync(join(root, '.changeset/pre.json'));
		expect(() => checkAlphaRelease(root)).toThrow();
	});
});

describe('alpha publish state', () => {
	it('hides prerelease state while publishing and restores it afterward', () => {
		const root = fixture();
		const prePath = join(root, '.changeset/pre.json');
		const original = readFileSync(prePath, 'utf8');
		let stateVisibleDuringPublish = true;
		withAlphaPublishState(root, () => {
			stateVisibleDuringPublish = existsSync(prePath);
		});
		expect(stateVisibleDuringPublish).toBe(false);
		expect(readFileSync(prePath, 'utf8')).toBe(original);
		expect(readdirSync(join(root, '.changeset'))).toEqual(['pre.json']);
	});

	it('restores prerelease state after a failed publish', () => {
		const root = fixture();
		const prePath = join(root, '.changeset/pre.json');
		const original = readFileSync(prePath, 'utf8');
		expect(() =>
			withAlphaPublishState(root, () => {
				throw new Error('Publish failed');
			})
		).toThrow('Publish failed');
		expect(readFileSync(prePath, 'utf8')).toBe(original);
	});
});

it('versions every public package into v3 alpha and keeps subsequent releases on alpha', () => {
	const root = fixture();
	writeFileSync(
		join(root, 'package.json'),
		JSON.stringify({
			name: 'release-fixture',
			private: true,
			workspaces: ['packages/*'],
		})
	);
	cpSync(join(REPO_ROOT, '.changeset'), join(root, '.changeset'), {
		recursive: true,
	});
	const configPath = join(root, '.changeset/config.json');
	const config = JSON.parse(readFileSync(configPath, 'utf8'));
	// This test exercises versioning without generating changelog text or querying git.
	config.changelog = false;
	writeFileSync(configPath, JSON.stringify(config));
	const publicPackages: { directory: string; name: string }[] = [];
	for (const directory of readdirSync(join(REPO_ROOT, 'packages'))) {
		const source = join(REPO_ROOT, 'packages', directory, 'package.json');
		if (
			!readdirSync(join(REPO_ROOT, 'packages', directory)).includes(
				'package.json'
			)
		) {
			continue;
		}
		mkdirSync(join(root, 'packages', directory), { recursive: true });
		copyFileSync(source, join(root, 'packages', directory, 'package.json'));
		const manifest = JSON.parse(readFileSync(source, 'utf8'));
		if (!manifest.private) {
			publicPackages.push({ directory, name: manifest.name });
		}
	}
	expect(publicPackages.length).toBeGreaterThan(0);
	expect(() => checkAlphaRelease(root, true)).not.toThrow();
	execFileSync(process.execPath, [changesetBin, 'version'], { cwd: root });
	expect(() => checkAlphaRelease(root)).not.toThrow();
	const pre = JSON.parse(
		readFileSync(join(REPO_ROOT, '.changeset/pre.json'), 'utf8')
	);
	const expectedVersion =
		pre.changesets.length === 0
			? /^3\.0\.0-alpha\.0$/u
			: /^3\.0\.0-alpha\.\d+$/u;
	for (const { directory } of publicPackages) {
		const manifest = JSON.parse(
			readFileSync(join(root, 'packages', directory, 'package.json'), 'utf8')
		);
		expect(manifest.version).toMatch(expectedVersion);
	}
	const corePath = join(root, 'packages/core/package.json');
	const firstVersion = JSON.parse(readFileSync(corePath, 'utf8'))
		.version as string;
	writeFileSync(
		join(root, '.changeset/next-alpha.md'),
		"---\n'@c15t/core': patch\n---\n\nFix consent persistence.\n"
	);
	execFileSync(process.execPath, [changesetBin, 'version'], { cwd: root });
	const nextVersion = JSON.parse(readFileSync(corePath, 'utf8')).version;
	const nextAlpha = Number(firstVersion.split('.').at(-1)) + 1;
	expect(nextVersion).toBe(`3.0.0-alpha.${nextAlpha}`);
	expect(() => checkAlphaRelease(root)).not.toThrow();
}, 30_000);
