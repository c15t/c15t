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
	it.each([
		{ entry: 'app/layout.tsx', uiStyle: 'prebuilt' as const },
		{ entry: 'app/layout.tsx', uiStyle: 'expanded' as const },
		{ entry: 'pages/_app.tsx', uiStyle: 'prebuilt' as const },
		{ entry: 'pages/_app.tsx', uiStyle: 'expanded' as const },
	])(
		'generates working theme wiring for $entry with $uiStyle',
		async ({ entry, uiStyle }) => {
			const options = await project(
				{ next: '15', react: '19', tailwindcss: '3.4.17' },
				{
					[entry]:
						'export default function Layout({ children }: { children: React.ReactNode }) { return <main>{children}</main>; }',
					'app/globals.css':
						'@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
					'postcss.config.mjs':
						'export default { plugins: { tailwindcss: {} } };',
				}
			);
			await generateFiles({ ...options, expandedTheme: 'tailwind', uiStyle });
			const root = options.context.projectRoot;
			expect(
				await readFile(
					join(root, 'components/consent-manager/provider.tsx'),
					'utf8'
				)
			).toContain('<ConsentTheme theme={theme} />');
			expect(
				await readFile(
					join(root, 'components/consent-manager/theme.ts'),
					'utf8'
				)
			).toContain('hover:!bg-blue-700');
			expect(await readFile(join(root, 'app/globals.css'), 'utf8')).toContain(
				'@import "c15t/next/styles.css";'
			);
			expect(
				await readFile(join(root, 'postcss.config.mjs'), 'utf8')
			).toContain("'c15t/postcss-tailwind3'");
		}
	);
	it('preserves both missing stylesheet and PostCSS warnings', async () => {
		const options = await project(
			{ next: '15', react: '19', tailwindcss: '3.4.17' },
			{
				'app/layout.tsx':
					'export default function Layout() { return <html><body /></html>; }',
			}
		);
		const result = await generateFiles(options);
		expect(result.warnings).toHaveLength(2);
		expect(result.warnings?.[0]).toContain('Import "c15t/next/styles.css"');
		expect(result.warnings?.[1]).toContain('postcss-tailwind3');
		expect(
			await readFile(
				join(
					options.context.projectRoot,
					'components/consent-manager/provider.tsx'
				),
				'utf8'
			)
		).not.toContain('./theme');
	});
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
		expect(content).toContain("from '@c15t/integrations/google-tag-manager'");
		expect(content).toContain('createScriptLoader({ kernel, scripts:');
	});

	// Layout fixtures initialize TypeScript's semantic program and edit real files.
	it.each([
		{
			dependencies: { react: '19', vite: '7' },
			file: 'src/App.tsx',
			provider: 'src/components/consent-manager/provider.tsx',
			source: 'const App = () => <main />; export default App;',
		},
		{
			dependencies: { react: '19', 'react-scripts': '5' },
			file: 'src/App.tsx',
			provider: 'src/components/consent-manager/provider.tsx',
			source: 'export default function App() { return <main />; }',
		},
		{
			dependencies: { next: '16', react: '19' },
			file: 'pages/_app.tsx',
			provider: 'components/consent-manager/provider.tsx',
			source:
				'export default ({ Component, pageProps }) => <Component {...pageProps} />;',
		},
		{
			dependencies: { next: '16', react: '19' },
			file: 'app/layout.tsx',
			provider: 'components/consent-manager/provider.tsx',
			source:
				'export function generateMetadata() { return { title: "Original" }; } export default function Layout({children}) { return <html><body>{children}</body></html>; }',
		},
	])(
		'honors scripts, compound UI, theme, backend URL and component selection for $file',
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
			});
			const root = options.context.projectRoot;
			const provider = await readFile(join(root, fixture.provider), 'utf8');
			expect(provider).toContain("from './consent-banner'");
			expect(provider).toContain('googleTagManager({');
			expect(provider).toContain('hosted({ url: "https://example.com" })');
			expect(provider).not.toMatch(/process\.env|import\.meta\.env/u);
			expect(provider).not.toContain("country: 'DE'");
			await expect(
				readFile(join(root, '.env.local'), 'utf8')
			).rejects.toThrow();
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
		},
		30_000
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
	}, 30_000);

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
