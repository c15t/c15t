import {
	mkdtemp,
	mkdir,
	readFile,
	writeFile,
	readdir,
	rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectFramework } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';

import {
	applyFileEdits,
	rollbackFileEdits,
} from '../../templates/shared/file-plan';
import { generateFiles, planGenerateFiles } from './generate-files';

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

const project = async function project(
	dependencies: Record<string, string>,
	files: Record<string, string> = {}
) {
	const directory = await mkdtemp(join(tmpdir(), 'c15t-generation-'));
	directories.push(directory);
	await writeFile(
		join(directory, 'package.json'),
		JSON.stringify({ dependencies })
	);
	await Promise.all(
		Object.entries(files).map(async ([name, contents]) => {
			await mkdir(join(directory, name, '..'), { recursive: true });
			await writeFile(join(directory, name), contents);
		})
	);
	return {
		context: {
			cwd: directory,
			framework: await detectFramework(directory),
			projectRoot: directory,
		} as CliContext,
		mode: 'offline' as const,
		spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } as Parameters<
			typeof generateFiles
		>[0]['spinner'],
	};
};

describe('generated project outcomes', () => {
	it('plans without writes and creates the vanilla config with selected scripts when applied', async () => {
		const options = await project({ vite: '7' });
		const plan = await planGenerateFiles({
			...options,
			selectedScripts: ['google-tag-manager'],
		});
		expect(await readdir(options.context.projectRoot)).toEqual([
			'package.json',
		]);
		await applyFileEdits(plan.edits);
		const content = await readFile(
			join(options.context.projectRoot, 'c15t.config.ts'),
			'utf8'
		);
		expect(content).toContain('createConsentKernel');
		expect(content).toContain("from '@c15t/scripts/google-tag-manager'");
		expect(content).toContain('createScriptLoader({ kernel, scripts:');
	});

	it.each([
		{
			dependencies: { react: '19', vite: '7' },
			env: 'VITE_C15T_URL',
			expression: 'import.meta.env.VITE_C15T_URL',
			file: 'src/App.tsx',
			provider: 'src/components/consent-manager/provider.tsx',
			source: 'const App = () => <main />; export default App;',
		},
		{
			dependencies: { react: '19', 'react-scripts': '5' },
			env: 'REACT_APP_C15T_URL',
			expression: 'process.env.REACT_APP_C15T_URL',
			file: 'src/App.tsx',
			provider: 'src/components/consent-manager/provider.tsx',
			source: 'export default function App() { return <main />; }',
		},
		{
			dependencies: { next: '16', react: '19' },
			env: 'NEXT_PUBLIC_C15T_URL',
			expression: 'process.env.NEXT_PUBLIC_C15T_URL',
			file: 'pages/_app.tsx',
			provider: 'components/consent-manager/provider.tsx',
			source:
				'export default ({ Component, pageProps }) => <Component {...pageProps} />;',
		},
		{
			dependencies: { next: '16', react: '19' },
			env: 'NEXT_PUBLIC_C15T_URL',
			expression: 'process.env.NEXT_PUBLIC_C15T_URL',
			file: 'app/layout.tsx',
			provider: 'components/consent-manager/provider.tsx',
			source:
				'export function generateMetadata() { return { title: "Original" }; } export default function Layout({children}) { return <html><body>{children}</body></html>; }',
		},
	])(
		'honors scripts, compound UI, theme, environment and component selection for $file / $env',
		async (fixture) => {
			const options = await project(fixture.dependencies, {
				[fixture.file]: fixture.source,
				'src/index.css': 'body { color: red; }',
			});
			const result = await generateFiles({
				...options,
				backendURL: 'https://example.com',
				expandedTheme: 'dark',
				mode: 'hosted',
				selectedScripts: ['google-tag-manager'],
				uiStyle: 'expanded',
				useEnvFile: true,
			});
			const root = options.context.projectRoot;
			const provider = await readFile(join(root, fixture.provider), 'utf8');
			expect(provider).toContain("from './consent-banner'");
			expect(provider).toContain('googleTagManager({');
			expect(provider).toContain(fixture.expression);
			expect(provider).not.toContain("country: 'DE'");
			expect(await readFile(join(root, '.env.local'), 'utf8')).toContain(
				`${fixture.env}=https://example.com`
			);
			expect(await readFile(join(root, fixture.file), 'utf8')).toContain(
				'<ConsentManager>'
			);
			expect(
				result.edits.some((edit) => edit.path.endsWith('src/index.css'))
			).toBe(true);
			await rollbackFileEdits(result.edits);
			expect(await readFile(join(root, fixture.file), 'utf8')).toBe(
				fixture.source
			);
			expect(await readFile(join(root, 'src/index.css'), 'utf8')).toBe(
				'body { color: red; }'
			);
			await expect(
				readFile(join(root, fixture.provider), 'utf8')
			).rejects.toThrow();
		}
	);

	it('leaves metadata helper returns untouched', async () => {
		const options = await project(
			{ next: '16', react: '19' },
			{
				'app/layout.tsx':
					'export function generateMetadata() { return { title: "Original" }; } export default () => <html><body>Site</body></html>;',
			}
		);
		await generateFiles(options);
		const updated = await readFile(
			join(options.context.projectRoot, 'app/layout.tsx'),
			'utf8'
		);
		expect(updated).toContain('return { title: "Original" };');
		expect(updated).toMatch(/<body>\s*<ConsentManager>/u);
	});

	it('does not write anything when generation cannot identify the exported layout', async () => {
		const options = await project(
			{ react: '19' },
			{ 'App.tsx': 'export default memo(() => <main />);' }
		);
		await expect(generateFiles(options)).rejects.toThrow('Cannot identify');
		expect(await readdir(options.context.projectRoot)).toEqual([
			'App.tsx',
			'package.json',
		]);
	});

	it('restores earlier writes if a later file changed after planning', async () => {
		const options = await project({}, { 'keep.txt': 'before' });
		const root = options.context.projectRoot;
		const edits = [
			{ after: 'generated', before: null, path: join(root, 'created.txt') },
			{ after: 'after', before: 'before', path: join(root, 'keep.txt') },
		];
		await writeFile(join(root, 'keep.txt'), 'user edit');
		await expect(applyFileEdits(edits)).rejects.toThrow(
			'File changed since planning'
		);
		await expect(readFile(join(root, 'created.txt'), 'utf8')).rejects.toThrow();
		expect(await readFile(join(root, 'keep.txt'), 'utf8')).toBe('user edit');
	});

	it.each(['vue', 'svelte', 'solid-js', '@tanstack/react-start'])(
		'reports manual integration for %s without creating a fallback',
		async (framework) => {
			const options = await project({ [framework]: '3.0.0' });
			await expect(generateFiles(options)).rejects.toThrow(
				'requires manual integration'
			);
			expect(await readdir(options.context.projectRoot)).toEqual([
				'package.json',
			]);
		}
	);
});
