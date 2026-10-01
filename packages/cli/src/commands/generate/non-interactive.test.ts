import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectFramework } from '../../context/framework-detection';
import type { CliContext } from '../../context/types';
import { c15tReleaseSpecifier } from '../../utils/c15t-release';
import { tailwind3CreateReactAppWarning } from '../shared/postcss-config';
import { generateWithoutPrompts } from './non-interactive';

const install = vi.fn();
const run = (context: CliContext) =>
	generateWithoutPrompts(context, { install });
const directories: string[] = [];
afterEach(async () => {
	vi.clearAllMocks();
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});
const fixture = async (flags: CliContext['flags'] = {}) => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-plan-'));
	directories.push(root);
	await writeFile(join(root, 'package.json'), '{}');
	return {
		commandArgs: ['offline'],
		cwd: root,
		flags,
		framework: await detectFramework(root),
		logger: { info: vi.fn(), success: vi.fn() },
		packageManager: { name: 'npm', version: null },
		projectRoot: root,
	} as unknown as CliContext;
};

describe('noninteractive setup', () => {
	it.each(['SIGINT', 'SIGTERM'] as const)(
		'waits for installer teardown before rollback on %s and removes signal handlers',
		async (signalName) => {
			const context = await fixture({ apply: true, json: true });
			const started = Promise.withResolvers<undefined>();
			const aborted = Promise.withResolvers<undefined>();
			const closed = Promise.withResolvers<undefined>();
			const counts = ['SIGINT', 'SIGTERM'].map((name) =>
				process.listenerCount(name)
			);
			install.mockImplementationOnce(
				async (_root, _dependencies, _manager, signal: AbortSignal) => {
					started.resolve(undefined);
					signal.addEventListener('abort', () => aborted.resolve(undefined), {
						once: true,
					});
					await closed.promise;
					signal.throwIfAborted();
				}
			);
			let finished = false;
			const result = (async () => {
				try {
					return await run(context);
				} catch (error) {
					return error;
				} finally {
					finished = true;
				}
			})();
			await started.promise;
			process.emit(signalName);
			await aborted.promise;
			expect(finished).toBe(false);
			expect(
				await readFile(join(context.projectRoot, 'c15t.config.ts'), 'utf8')
			).toContain('createConsentKernel');
			closed.resolve(undefined);
			expect(await result).toMatchObject({ code: 'CANCELLED' });
			expect(await readdir(context.projectRoot)).toEqual(['package.json']);
			expect(
				['SIGINT', 'SIGTERM'].map((name) => process.listenerCount(name))
			).toEqual(counts);
		}
	);
	it('defaults to a structured plan without filesystem or installation changes', async () => {
		const context = await fixture();
		const result = await run(context);
		expect(result.applied).toBe(false);
		expect(result.edits).toHaveLength(1);
		expect(await readdir(context.projectRoot)).toEqual(['package.json']);
		expect(install).not.toHaveBeenCalled();
	});
	it('applies files with skip-install and removes the recovery journal', async () => {
		const context = await fixture({ apply: true, 'skip-install': true });
		const result = await run(context);
		expect(result.applied).toBe(true);
		expect(
			await readFile(join(context.projectRoot, 'c15t.config.ts'), 'utf8')
		).toContain('createConsentKernel');
		expect(await readdir(context.projectRoot)).toEqual([
			'c15t.config.ts',
			'package.json',
		]);
		expect(install).not.toHaveBeenCalled();
	});
	it('writes the hosted backend URL as a literal and no environment file', async () => {
		const context = await fixture({
			apply: true,
			'backend-url': 'https://consent.example.com',
			'skip-install': true,
		});
		context.commandArgs = ['hosted'];
		const result = await run(context);
		expect(result.applied).toBe(true);
		const config = await readFile(
			join(context.projectRoot, 'c15t.config.ts'),
			'utf8'
		);
		expect(config).toContain(
			'createHostedTransport({ backendURL: "https://consent.example.com" })'
		);
		expect(config).not.toMatch(/process\.env|import\.meta\.env/u);
		expect(await readdir(context.projectRoot)).toEqual([
			'c15t.config.ts',
			'package.json',
		]);
	});
	it('redacts an internal stylesheet alias to an environment file', async () => {
		const context = await fixture({ json: true, plan: true });
		await writeFile(
			join(context.projectRoot, 'package.json'),
			'{"dependencies":{"react":"19.2.0"}}'
		);
		context.framework = await detectFramework(context.projectRoot);
		await mkdir(join(context.projectRoot, 'src'));
		await writeFile(
			join(context.projectRoot, 'src/App.tsx'),
			'export default function App() { return <main>Hello</main>; }'
		);
		const envPath = join(context.projectRoot, '.env.local');
		const stylesheetPath = join(context.projectRoot, 'src/index.css');
		const secret = 'PRIVATE_KEY=aliased-environment-secret\n';
		await writeFile(envPath, secret);
		await symlink('../.env.local', stylesheetPath);
		const result = await run(context);
		expect(JSON.stringify(result)).not.toContain('aliased-environment-secret');
		expect(result.edits).toContainEqual({
			operation: 'update',
			path: stylesheetPath,
			redacted: true,
		});
		expect(await readFile(envPath, 'utf8')).toBe(secret);
	});
	it.each([
		{ postcssConfig: 'module.exports = { plugins: { tailwindcss: {} } };\n' },
		{ postcssConfig: null },
	])(
		'warns that Create React App cannot run the Tailwind 3 plugin (config: $postcssConfig)',
		async ({ postcssConfig }) => {
			const context = await fixture({ apply: true, 'skip-install': true });
			const root = context.projectRoot;
			await writeFile(
				join(root, 'package.json'),
				JSON.stringify({
					dependencies: { react: '18.3.1', 'react-scripts': '5.0.1' },
					devDependencies: { tailwindcss: '3.4.17' },
				})
			);
			if (postcssConfig) {
				await writeFile(join(root, 'postcss.config.js'), postcssConfig);
			}
			await mkdir(join(root, 'src'));
			await writeFile(
				join(root, 'src/index.css'),
				'@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'
			);
			await writeFile(
				join(root, 'src/App.jsx'),
				'export default function App() { return <main />; }\n'
			);
			context.framework = await detectFramework(root);
			const warn = vi.fn();
			context.logger = { ...context.logger, warn } as CliContext['logger'];

			const result = await run(context);

			const warning = tailwind3CreateReactAppWarning('c15t/postcss-tailwind3');
			expect(result.warnings).toEqual([warning]);
			expect(warn).toHaveBeenCalledWith(warning);
			expect(
				result.edits.filter((edit) => edit.path.includes('postcss'))
			).toEqual([]);
			expect(
				(await readdir(root)).filter((name) => name.includes('postcss'))
			).toEqual(postcssConfig ? ['postcss.config.js'] : []);
			expect(
				postcssConfig &&
					(await readFile(join(root, 'postcss.config.js'), 'utf8'))
			).toBe(postcssConfig);
		},
		30_000
	);
	it.each([
		{
			dependencies: [`c15t@${c15tReleaseSpecifier()}`],
			installed: {},
			plugin: 'c15t/postcss-tailwind3',
		},
		{
			dependencies: [],
			installed: { '@c15t/react': '3.0.0' },
			plugin: '@c15t/react/postcss-tailwind3',
		},
	])(
		'adds $plugin for Tailwind 3 without installing @c15t/ui',
		async ({ dependencies, installed, plugin }) => {
			const context = await fixture({ apply: true });
			const root = context.projectRoot;
			await writeFile(
				join(root, 'package.json'),
				JSON.stringify({
					dependencies: {
						react: '19.2.7',
						'react-dom': '19.2.7',
						...installed,
					},
					devDependencies: {
						'@vitejs/plugin-react': '6.0.3',
						tailwindcss: '3.4.17',
					},
				})
			);
			await writeFile(
				join(root, 'postcss.config.js'),
				'export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n'
			);
			await mkdir(join(root, 'src'));
			await writeFile(
				join(root, 'src/index.css'),
				'@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'
			);
			await writeFile(
				join(root, 'src/App.jsx'),
				'export default function App() { return <main />; }\n'
			);
			context.framework = await detectFramework(root);

			const result = await run(context);

			expect(result.dependencies).toEqual(dependencies);
			expect(await readFile(join(root, 'postcss.config.js'), 'utf8')).toBe(
				`export default { plugins: { '${plugin}': {}, tailwindcss: {}, autoprefixer: {} } };\n`
			);
		},
		30_000
	);
	it('installs c15t packages from the release line of the CLI', async () => {
		const context = await fixture({ apply: true, scripts: 'google-tag' });
		const release = c15tReleaseSpecifier();
		const result = await run(context);
		const pinned = [
			`c15t@${release}`,
			`@c15t/integrations@${release}`,
			`@c15t/translations@${release}`,
		];
		expect(result.dependencies).toEqual(pinned);
		expect(install).toHaveBeenCalledWith(
			context.projectRoot,
			pinned,
			'npm',
			expect.any(AbortSignal)
		);
	});
	it('restores generated files when dependency installation fails', async () => {
		install.mockRejectedValueOnce(new Error('installation failed'));
		const context = await fixture({ apply: true });
		await expect(run(context)).rejects.toMatchObject({
			code: 'CONFIG_INVALID',
		});
		expect(await readdir(context.projectRoot)).toEqual(['package.json']);
	});
	it.each([
		{ apply: true, plan: true },
		{ plan: true, resume: true },
		{ resume: true },
		{ mode: 'hosted' },
		{ 'backend-url': 'https://example.com', project: 'example' },
	])('rejects conflicting setup options %j', async (flags) => {
		const context = await fixture(flags);
		await expect(run(context)).rejects.toMatchObject({
			code: 'FLAG_INVALID',
		});
		expect(await readdir(context.projectRoot)).toEqual(['package.json']);
	});
});
