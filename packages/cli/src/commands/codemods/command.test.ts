import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runCli } from '../../index';

const directories: string[] = [];
const fixture = async (declaredVersion = '3.0.0') => {
	const cwd = await mkdtemp(join(tmpdir(), 'c15t-legacy-command-'));
	directories.push(cwd);
	await writeFile(
		join(cwd, 'package.json'),
		JSON.stringify({
			dependencies: { '@c15t/integrations': '^1.0.0', c15t: declaredVersion },
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
	it('runs the integrations rename only when explicitly selected', async () => {
		const { cwd, filePath } = await fixture();
		const source = "import { posthog } from '@c15t/scripts/posthog';\n";
		await writeFile(filePath, source);
		const automatic = await runCli(['codemods', '--all', '--json'], { cwd });
		expect(automatic.success).toBe(true);
		expect(await readFile(filePath, 'utf8')).toBe(source);
		const preview = await runCli(
			['codemods', 'scripts-to-integrations', '--dry-run', '--json'],
			{ cwd }
		);
		expect(preview.success).toBe(true);
		expect(preview.data).toHaveProperty('results', [
			expect.objectContaining({
				id: 'scripts-to-integrations',
				result: expect.objectContaining({
					changedFiles: [
						expect.objectContaining({
							after: source.replace('@c15t/scripts', '@c15t/integrations'),
						}),
					],
				}),
			}),
		]);
		expect(await readFile(filePath, 'utf8')).toBe(source);
		const applied = await runCli(
			['codemods', 'scripts-to-integrations', '--json'],
			{ cwd }
		);
		expect(applied.success).toBe(true);
		expect(await readFile(filePath, 'utf8')).toBe(
			source.replace('@c15t/scripts', '@c15t/integrations')
		);
	});

	it('chains named v3 transforms and leaves them out of --all', async () => {
		const { cwd, filePath } = await fixture('2.3.0');
		const source = `import { ConsentManagerProvider, useHeadlessConsentUI } from '@c15t/react';
export const App = ({ children }) => (
	<ConsentManagerProvider
		options={{
			mode: 'hosted',
			backendURL: '/api/c15t',
			callbacks: { onConsentChanged: () => {} },
		}}
	>
		{children}
	</ConsentManagerProvider>
);
`;
		await writeFile(filePath, source);
		const automatic = await runCli(['codemods', '--all', '--json'], { cwd });
		expect(automatic.success).toBe(true);
		expect(await readFile(filePath, 'utf8')).toBe(source);

		const applied = await runCli(
			[
				'codemods',
				'consent-provider-options',
				'callbacks-to-v3',
				'root-exports-to-subpaths',
				'--json',
			],
			{ cwd }
		);
		expect(applied.success, JSON.stringify(applied)).toBe(true);
		const updated = await readFile(filePath, 'utf8');
		expect(updated).toContain(
			"import { ConsentProvider, hosted } from '@c15t/react';\nimport { useHeadlessConsentUI } from '@c15t/react/headless';"
		);
		expect(updated).toContain("mode: hosted({ backendURL: '/api/c15t' }),");
		expect(updated).toContain('onChoiceRecorded: () => {}');
		expect(updated).toContain('</ConsentProvider>');
	}, 30_000);

	it('moves scoped imports to c15t before the other v3 transforms read them', async () => {
		const { cwd, filePath } = await fixture('3.0.0-alpha.9');
		await writeFile(
			join(cwd, 'src/index.css'),
			'@import "@c15t/react/styles.css";\n'
		);
		await writeFile(
			filePath,
			`import { ConsentManagerProvider, useHeadlessConsentUI } from '@c15t/react';
export const App = ({ children }) => (
	<ConsentManagerProvider options={{ mode: 'hosted', backendURL: '/api/c15t' }}>
		{children}
	</ConsentManagerProvider>
);
`
		);

		const applied = await runCli(
			[
				'codemods',
				'root-exports-to-subpaths',
				'consent-provider-options',
				'packages-to-c15t',
				'--json',
			],
			{ cwd }
		);
		expect(applied.success, JSON.stringify(applied)).toBe(true);
		expect(await readFile(filePath, 'utf8')).toContain(
			"import { ConsentProvider, hosted } from 'c15t/react';\nimport { useHeadlessConsentUI } from 'c15t/react/headless';"
		);
		expect(await readFile(join(cwd, 'src/index.css'), 'utf8')).toBe('');
	}, 30_000);

	it.each(['2.0.0-rc.4', '2.0.0-canary-20260731105620', '2.0.0-alpha.1'])(
		'does not automatically apply legacy transforms to %s',
		async (declaredVersion) => {
			const { cwd, filePath, source } = await fixture(declaredVersion);
			const result = await runCli(['codemods', '--all', '--json'], { cwd });
			expect(result, JSON.stringify(result)).toMatchObject({
				data: { declaredVersion, results: [], sourceVersion: declaredVersion },
				success: true,
			});
			expect(await readFile(filePath, 'utf8')).toBe(source);
			expect(await readFile(join(cwd, 'src/index.css'), 'utf8')).toBe('');
		},
		20_000
	);
	it.each([
		{ args: [], declaredVersion: '1.9.0' },
		{ args: ['--from', '1.9.0'], declaredVersion: '2.0.0-rc.4' },
	])(
		'applies legacy transforms from v1 with declared $declaredVersion and $args',
		async ({ declaredVersion, args }) => {
			const { cwd, filePath } = await fixture(declaredVersion);
			const result = await runCli(['codemods', '--all', '--json', ...args], {
				cwd,
			});
			expect(result, JSON.stringify(result)).toMatchObject({
				data: { declaredVersion, sourceVersion: '1.9.0' },
				success: true,
			});
			expect(await readFile(filePath, 'utf8')).toContain('<ConsentBanner />');
			expect(await readFile(filePath, 'utf8')).not.toContain('CookieBanner');
		},
		20_000
	);
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

	it('reports the release that the named transforms migrate to', async () => {
		const { cwd } = await fixture('2.3.0');
		const v3 = await runCli(
			['codemods', 'consent-provider-options', '--dry-run', '--json'],
			{ cwd }
		);
		expect(v3, JSON.stringify(v3)).toMatchObject({
			data: {
				kind: 'codemods',
				results: [{ id: 'consent-provider-options', targetVersion: '3.0.0' }],
				targetVersion: '3.0.0',
			},
			success: true,
		});

		const mixed = await runCli(
			// Named out of order: they still run in the registry's order.
			[
				'codemods',
				'consent-provider-options',
				'component-renames',
				'--dry-run',
				'--json',
			],
			{ cwd }
		);
		expect(mixed, JSON.stringify(mixed)).toMatchObject({
			data: {
				kind: 'codemods',
				results: [
					{ id: 'component-renames', targetVersion: '2.0.0' },
					{ id: 'consent-provider-options', targetVersion: '3.0.0' },
				],
				targetVersion: '3.0.0',
			},
			success: true,
		});

		const legacy = await runCli(
			['codemods', 'component-renames', '--dry-run', '--json'],
			{ cwd }
		);
		expect(legacy).toMatchObject({
			data: { kind: 'legacy-codemods', targetVersion: '2.0.0' },
			success: true,
		});
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
