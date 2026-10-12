import { execFileSync } from 'node:child_process';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const selector = fileURLToPath(new URL('./ci-plan.ts', import.meta.url));
const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

const fixture = () => {
	const cwd = mkdtempSync(join(tmpdir(), 'c15t-release-plan-'));
	roots.push(cwd);
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
	const write = (path: string, contents: string) => {
		mkdirSync(dirname(join(cwd, path)), { recursive: true });
		writeFileSync(join(cwd, path), contents);
	};
	git('init', '--quiet');
	git('config', 'user.email', 'test@example.com');
	git('config', 'user.name', 'Test');
	write('package.json', JSON.stringify({ workspaces: ['packages/*'] }));
	for (const name of ['core', 'logger', 'react-native', 'web']) {
		write(
			`packages/${name}/package.json`,
			JSON.stringify({
				dependencies: name === 'core' ? { '@c15t/logger': '*' } : {},
				devDependencies: name === 'react-native' ? { '@c15t/core': '*' } : {},
				name: `@c15t/${name}`,
				scripts: { build: 'build', 'check-types': 'types', test: 'test' },
				version: '3.0.0-alpha.1',
			})
		);
	}
	const lock = {
		lockfileVersion: 1,
		packages: { external: ['external@1.0.0'] },
		workspaces: {
			'packages/core': { name: '@c15t/core', version: '3.0.0-alpha.1' },
		},
	};
	write('bun.lock', JSON.stringify(lock));
	write('.tegami/publish-lock.yaml', 'original');
	write('packages/react-native/ios/bridge.swift', 'original');
	const commit = () => {
		git('add', '.');
		git('commit', '--quiet', '-m', 'change');
		return git('rev-parse', 'HEAD');
	};
	const base = commit();
	const select = (comparison = base, args: string[] = [], release = true) => {
		execFileSync('bun', [selector, ...args], {
			cwd,
			encoding: 'utf8',
			env: {
				...process.env,
				CI_DIFF_BASE: comparison,
				CI_RELEASE_SELECTION: String(release),
				GITHUB_OUTPUT: join(cwd, 'outputs'),
				GITHUB_STEP_SUMMARY: join(cwd, 'summary'),
			},
		});
		return JSON.parse(readFileSync(join(cwd, 'ci-plan.json'), 'utf8'));
	};
	return { base, commit, cwd, lock, select, write };
};

describe('affected release selection', () => {
	it.each([
		{ device: false, files: ['packages/web/src/index.ts'], mobile: false },
		{ device: false, files: ['docs/mobile.mdx'], mobile: false },
		{
			device: false,
			files: ['packages/react-native/src/index.ts'],
			mobile: false,
		},
		{ device: false, files: ['packages/core/src/index.ts'], mobile: false },
		{
			device: false,
			files: ['packages/react-native/src/specs/NativeC15t.ts'],
			mobile: true,
		},
		{
			device: true,
			files: ['packages/react-native/ios/bridge.swift'],
			mobile: true,
		},
		{ device: true, files: ['native/core-swift/kernel.swift'], mobile: true },
	])(
		'selects native=$mobile and device=$device for $files',
		({ files, mobile, device }) => {
			const { write, commit, select } = fixture();
			for (const path of files) {
				write(path, 'changed');
			}
			commit();
			expect(select()).toMatchObject({ mobile, mobileBrowserOrDevice: device });
		}
	);

	it('keeps JavaScript dependents and forward build dependencies for a core change', () => {
		const { write, commit, select, base, cwd } = fixture();
		write('packages/core/src/index.ts', 'changed');
		commit();
		const plan = select();
		expect(plan.full).toBe(false);
		expect(plan.tests.sort()).toEqual(['@c15t/core', '@c15t/react-native']);
		expect(plan.build).toContain('@c15t/logger');
		expect(plan.tests).not.toContain('@c15t/web');
		expect(readFileSync(join(cwd, 'outputs'), 'utf8')).toContain(
			`baseRef=${base}\n`
		);
	});

	it('includes changes from a failed earlier push and deleted native inputs', () => {
		const { write, commit, select, cwd } = fixture();
		rmSync(join(cwd, 'packages/react-native/ios/bridge.swift'));
		commit();
		write('packages/web/src/index.ts', 'later push');
		commit();
		expect(select()).toMatchObject({
			mobile: true,
			mobileBrowserOrDevice: true,
		});
	});

	it('builds bumped versions without rerunning runtime or native suites', () => {
		const { write, commit, select, cwd, lock } = fixture();
		const manifest = JSON.parse(
			readFileSync(join(cwd, 'packages/core/package.json'), 'utf8')
		);
		manifest.version = '3.0.0-alpha.2';
		lock.workspaces['packages/core'].version = manifest.version;
		write('packages/core/package.json', JSON.stringify(manifest));
		write('bun.lock', JSON.stringify(lock));
		write('.tegami/publish-lock.yaml', 'versioned');
		write('packages/core/CHANGELOG.md', 'release note');
		commit();
		const plan = select();
		expect(plan.build.toSorted()).toEqual(['@c15t/core', '@c15t/logger']);
		expect(plan).toMatchObject({
			docs: true,
			full: false,
			integrations: [],
			mobile: false,
			mobileBrowserOrDevice: false,
			tests: [],
			types: [],
		});
		expect(select(undefined, [], false).full).toBe(true);
	});

	it('still validates real dependency changes and source changes alongside version bumps', () => {
		const { write, commit, select, lock } = fixture();
		lock.packages.external = ['external@2.0.0'];
		write('bun.lock', JSON.stringify(lock));
		write('packages/core/src/index.ts', 'runtime changed');
		commit();
		expect(select()).toMatchObject({
			full: true,
			mobile: true,
			mobileBrowserOrDevice: true,
		});
	});

	it('normalizes version metadata in lockfiles larger than the default process buffer', () => {
		const { write, commit, select, cwd, lock } = fixture();
		lock.packages.external.push('x'.repeat(1024 * 1024));
		write('bun.lock', JSON.stringify(lock));
		const base = commit();
		const manifest = JSON.parse(
			readFileSync(join(cwd, 'packages/core/package.json'), 'utf8')
		);
		manifest.version = '3.0.0-alpha.2';
		lock.workspaces['packages/core'].version = manifest.version;
		write('packages/core/package.json', JSON.stringify(manifest));
		write('bun.lock', JSON.stringify(lock));
		commit();
		expect(select(base)).toMatchObject({ full: false, tests: [] });
	});

	it.each(['', '0'.repeat(40), 'missing-revision'])(
		'falls back to full checks for an unavailable base %s',
		(base) => {
			const { write, commit, select } = fixture();
			write('packages/web/src/index.ts', 'changed');
			commit();
			expect(select(base)).toMatchObject({
				full: true,
				mobile: true,
				mobileBrowserOrDevice: true,
			});
		}
	);

	it('keeps manual full validation full', () => {
		const { select } = fixture();
		expect(select(undefined, ['--full'])).toMatchObject({
			full: true,
			mobile: true,
			mobileBrowserOrDevice: true,
		});
	});
});
