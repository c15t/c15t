import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runCli } from '../../index';

const directories: string[] = [];
const fixture = async () => {
	const cwd = await mkdtemp(join(tmpdir(), 'c15t-legacy-command-'));
	directories.push(cwd);
	await writeFile(
		join(cwd, 'package.json'),
		JSON.stringify({
			dependencies: { '@c15t/scripts': '^1.0.0', c15t: '^3.0.0' },
			name: 'fixture',
			version: '9.9.9',
		})
	);
	await mkdir(join(cwd, 'src'));
	await writeFile(join(cwd, 'src/index.css'), '');
	const filePath = join(cwd, 'src/App.tsx');
	const source = `import "./index.css";
import { CookieBanner, ConsentManagerProvider } from '@c15t/react';
const options = { mode: 'c15t' };
export const App = () => <ConsentManagerProvider options={options}><CookieBanner /></ConsentManagerProvider>;
`;
	await writeFile(filePath, source);
	return { cwd, filePath, source };
};

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('legacy migration command', () => {
	it('lists transforms with the application version rather than an integration version', async () => {
		const { cwd } = await fixture();
		const result = await runCli(['codemods', '--list', '--json'], { cwd });
		expect(result).toMatchObject({
			data: { declaredVersion: '3.0.0', targetVersion: '2.0.0' },
			exitCode: 0,
			success: true,
		});
		expect(result.data).toHaveProperty(
			'codemods',
			expect.arrayContaining([
				expect.objectContaining({ applicable: false, id: 'component-renames' }),
			])
		);
	});

	it('requires an explicit migration selection without a terminal', async () => {
		const { cwd } = await fixture();
		const result = await runCli(['codemods', '--json'], { cwd });
		expect(result.success).toBe(false);
		expect(result.exitCode).toBe(1);
	});

	it('previews named transforms after dependencies were upgraded without writing files', async () => {
		const { cwd, filePath, source } = await fixture();
		const result = await runCli(
			[
				'codemods',
				'component-renames',
				'mode-c15t-to-hosted',
				'--dry-run',
				'--json',
			],
			{ cwd }
		);
		expect(result.success).toBe(true);
		expect(result.data).toHaveProperty(
			'results',
			expect.arrayContaining([
				expect.objectContaining({
					id: 'component-renames',
					result: expect.objectContaining({
						changedFiles: expect.arrayContaining([
							expect.objectContaining({
								after: expect.stringContaining('<ConsentBanner />'),
							}),
						]),
					}),
				}),
				expect.objectContaining({
					id: 'mode-c15t-to-hosted',
					result: expect.objectContaining({
						changedFiles: expect.arrayContaining([
							expect.objectContaining({
								after: expect.stringContaining("mode: 'hosted'"),
							}),
						]),
					}),
				}),
			])
		);
		expect(await readFile(filePath, 'utf8')).toBe(source);
	}, 20_000);

	it('uses an explicit source version for all legacy transforms and rejects unsupported targets', async () => {
		const { cwd, filePath, source } = await fixture();
		const preview = await runCli(
			[
				'codemods',
				'--all',
				'--from',
				'1.9.0',
				'--to',
				'2.0.0',
				'--dry-run',
				'--json',
			],
			{ cwd }
		);
		expect(preview).toMatchObject({
			data: { sourceVersion: '1.9.0' },
			success: true,
		});
		expect(await readFile(filePath, 'utf8')).toBe(source);
		const unsupported = await runCli(
			['codemods', '--all', '--from', '2.0.0', '--to', '3.0.0', '--json'],
			{ cwd }
		);
		expect(unsupported.success).toBe(false);
		expect(await readFile(filePath, 'utf8')).toBe(source);
	}, 20_000);
});
