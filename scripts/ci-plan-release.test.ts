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

import { describe, expect, it } from 'vitest';

const selector = fileURLToPath(new URL('./ci-plan.ts', import.meta.url));

describe('release mobile selection', () => {
	it.each([
		{ device: false, files: ['packages/web/src/index.ts'], mobile: false },
		{ device: false, files: ['docs/mobile.mdx'], mobile: false },
		{
			device: true,
			files: ['packages/react-native/ios/bridge.swift'],
			mobile: true,
			remove: true,
		},
		{
			device: false,
			files: ['packages/react-native/src/index.ts'],
			mobile: true,
		},
		{ device: false, files: ['packages/core/src/index.ts'], mobile: true },
		{ device: true, files: ['native/core-swift/kernel.swift'], mobile: true },
		{
			device: true,
			files: ['packages/react-native/ios/bridge.swift'],
			mobile: true,
		},
		{
			device: true,
			files: [
				'packages/react-native/ios/bridge.swift',
				'packages/web/src/index.ts',
			],
			mobile: true,
		},
		{ device: true, files: ['bun.lock'], mobile: true },
		{
			base: '',
			device: true,
			files: ['packages/web/src/index.ts'],
			mobile: true,
		},
		{
			base: '0'.repeat(40),
			device: true,
			files: ['packages/web/src/index.ts'],
			mobile: true,
		},
		{
			base: 'missing-revision',
			device: true,
			files: ['packages/web/src/index.ts'],
			mobile: true,
		},
		{
			args: ['--full'],
			device: true,
			files: ['packages/web/src/index.ts'],
			mobile: true,
		},
	])(
		'selects mobile=$mobile and device=$device for $files with base $base',
		(scenario) => {
			const cwd = mkdtempSync(join(tmpdir(), 'c15t-release-plan-'));
			const git = (...args: string[]) =>
				execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
			const write = (path: string, contents: string) => {
				mkdirSync(dirname(join(cwd, path)), { recursive: true });
				writeFileSync(join(cwd, path), contents);
			};
			try {
				git('init', '--quiet');
				git('config', 'user.email', 'test@example.com');
				git('config', 'user.name', 'Test');
				write('package.json', JSON.stringify({ workspaces: ['packages/*'] }));
				for (const name of ['core', 'react-native', 'web']) {
					write(
						`packages/${name}/package.json`,
						JSON.stringify({
							dependencies:
								name === 'react-native' ? { '@c15t/core': '*' } : {},
							name: `@c15t/${name}`,
							scripts: { build: 'build', 'check-types': 'types', test: 'test' },
						})
					);
				}
				if ('remove' in scenario) {
					for (const path of scenario.files) {
						write(path, 'original');
					}
				}
				git('add', '.');
				git('commit', '--quiet', '-m', 'base');
				const base = git('rev-parse', 'HEAD');
				for (const path of scenario.files) {
					if ('remove' in scenario) {
						rmSync(join(cwd, path));
					} else {
						write(path, 'changed');
					}
					git('add', '.');
					git('commit', '--quiet', '-m', 'change');
				}
				const output = join(cwd, 'outputs');
				const summary = join(cwd, 'summary');
				execFileSync(
					'bun',
					[selector, ...('args' in scenario ? scenario.args : [])],
					{
						cwd,
						encoding: 'utf8',
						env: {
							...process.env,
							CI_DIFF_BASE: '',
							CI_MOBILE_DIFF_BASE: 'base' in scenario ? scenario.base : base,
							GITHUB_OUTPUT: output,
							GITHUB_STEP_SUMMARY: summary,
						},
					}
				);
				expect(
					JSON.parse(readFileSync(join(cwd, 'ci-plan.json'), 'utf8'))
				).toMatchObject({
					build: expect.arrayContaining([
						'@c15t/core',
						'@c15t/react-native',
						'@c15t/web',
					]),
					full: true,
					mobile: scenario.mobile,
					mobileBrowserOrDevice: scenario.device,
					tests: expect.arrayContaining([
						'@c15t/core',
						'@c15t/react-native',
						'@c15t/web',
					]),
				});
				expect(readFileSync(output, 'utf8')).toContain(
					`mobile=${scenario.mobile}\n`
				);
				expect(readFileSync(output, 'utf8')).toContain(
					`mobileBrowserOrDevice=${scenario.device}\n`
				);
			} finally {
				rmSync(cwd, { force: true, recursive: true });
			}
		}
	);
});
