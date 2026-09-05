import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { detectFramework } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';

import { generateExpandedProviderTemplate } from '../../templates/shared/expanded-components';
import { REACT_CONFIG } from '../../templates/shared/framework-config';
import { generateFiles } from './generate-files';
import type { GenerateFilesOptions } from './generate-files';

describe('detected React development environment', () => {
	it.each([
		{ dependencies: { vite: '7' }, environment: 'vite' },
		{ dependencies: { '@vitejs/plugin-react': '5' }, environment: 'vite' },
		{
			dependencies: { '@remix-run/react': '2', vite: '7' },
			environment: 'vite',
		},
		{ dependencies: { gatsby: '5', vite: '7' }, environment: 'node' },
		{ dependencies: { 'react-scripts': '5' }, environment: 'node' },
		{ dependencies: { webpack: '5' }, environment: 'node' },
		{
			dependencies: { '@vitejs/plugin-react': '5', vite: '7', webpack: '5' },
			environment: 'node',
		},
		{
			dependencies: { '@vitejs/plugin-react': '5', vite: '7', webpack: '5' },
			environment: 'node',
			scripts: { build: 'webpack --mode production', test: 'vite build' },
		},
		{
			dependencies: { vite: '7', webpack: '5' },
			environment: 'vite',
			scripts: { build: 'tsc -b && vite build' },
		},
		{
			dependencies: { vite: '7', webpack: '5' },
			environment: 'node',
			scripts: { build: 'webpack', dev: 'vite' },
		},
		{ dependencies: { rollup: '4' }, environment: 'manual' },
		{ dependencies: { esbuild: '0.25' }, environment: 'manual' },
		{
			dependencies: { rollup: '4', vite: '7' },
			environment: 'manual',
			scripts: { build: 'rollup -c', dev: 'vite' },
		},
		{ dependencies: {}, environment: 'manual' },
	])(
		'generates the $environment guard for $dependencies',
		async ({ dependencies, environment, scripts }) => {
			const directory = await mkdtemp(join(tmpdir(), 'c15t-react-guard-'));
			try {
				await writeFile(
					join(directory, 'package.json'),
					JSON.stringify({
						dependencies: { react: '19', ...dependencies },
						scripts,
					})
				);
				await writeFile(
					join(directory, 'App.tsx'),
					'export default function App() { return <main />; }'
				);
				const framework = await detectFramework(directory);
				expect(framework.developmentEnvironment).toBe(environment);
				const result = await generateFiles({
					context: {
						cwd: directory,
						framework,
						projectRoot: directory,
					} as CliContext,
					enableDevTools: true,
					mode: 'offline',
					spinner: {
						start: vi.fn(),
						stop: vi.fn(),
					} as GenerateFilesOptions['spinner'],
				});
				expect(result.layoutUpdated).toBe(true);
				const prebuilt = await readFile(
					join(directory, 'components/consent-manager/provider.tsx'),
					'utf8'
				);
				const expanded = generateExpandedProviderTemplate({
					developmentEnvironment: framework.developmentEnvironment,
					enableDevTools: true,
					enableSSR: false,
					framework: REACT_CONFIG,
					optionsText: 'mode: offline(),',
				});
				for (const source of [prebuilt, expanded]) {
					if (environment === 'manual') {
						expect(source).toContain('const DevTools = false');
						expect(source).toContain(
							"your bundler's build-time development flag"
						);
						expect(source).not.toContain('process.env');
						expect(source).not.toContain('import.meta.env');
						continue;
					}
					expect(source).toContain(
						environment === 'vite'
							? 'const DevTools = import.meta.env.DEV'
							: "const DevTools = process.env.NODE_ENV !== 'production'"
					);
					expect(source).not.toContain(
						environment === 'vite' ? 'process.env' : 'import.meta.env'
					);
				}
			} finally {
				await rm(directory, { force: true, recursive: true });
			}
		}
	);
});
