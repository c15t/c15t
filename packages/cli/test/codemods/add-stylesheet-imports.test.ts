import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runAddStylesheetImportsCodemod } from '../../src/commands/codemods/add-stylesheet-imports';

const tempDirs: string[] = [];

async function createProject(
	files: Record<string, string>
): Promise<{ root: string }> {
	const root = await mkdtemp(join(tmpdir(), 'c15t-add-stylesheet-'));
	tempDirs.push(root);

	for (const [relativePath, content] of Object.entries(files)) {
		const filePath = join(root, relativePath);
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, content, 'utf-8');
	}

	return { root };
}

async function readProjectFile(
	root: string,
	relativePath: string
): Promise<string> {
	return readFile(join(root, relativePath), 'utf-8');
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
	);
});

describe('add-stylesheet-imports codemod', () => {
	it('adds the React stylesheet to the imported CSS entrypoint', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import './index.css';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/index.css': ':root { color: #111827; }\n',
			'src/app.tsx': [
				"import { ConsentBanner } from '@c15t/react';",
				'',
				'export function App() {',
				'  return <ConsentBanner />;',
				'}',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});
		const indexCss = await readProjectFile(root, 'src/index.css');
		const mainTsx = await readProjectFile(root, 'src/main.tsx');

		expect(result.errors).toHaveLength(0);
		expect(result.changedFiles).toHaveLength(1);
		expect(result.changedFiles[0]?.filePath).toContain('src/index.css');
		expect(result.changedFiles[0]?.summaries).toContain(
			'added @import "@c15t/react/styles.css";'
		);
		expect(indexCss).toContain('@import "@c15t/react/styles.css";');
		expect(mainTsx).not.toContain('@c15t/react/styles.css');
	});

	it('moves Next.js Tailwind 3 imports into app/globals.css and removes the JS import', async () => {
		const { root } = await createProject({
			'package.json': JSON.stringify({
				name: 'tw3-next-app',
				devDependencies: {
					tailwindcss: '^3.4.17',
				},
			}),
			'app/layout.tsx': [
				"import '@c15t/nextjs/styles.css';",
				"import './globals.css';",
				'',
				'export default function RootLayout({ children }: { children: React.ReactNode }) {',
				'  return <html><body>{children}</body></html>;',
				'}',
			].join('\n'),
			'app/globals.css': [
				'@tailwind base;',
				'@tailwind components;',
				'@tailwind utilities;',
			].join('\n'),
			'app/provider.tsx': [
				"import { ConsentBanner } from '@c15t/nextjs';",
				'',
				'export function Provider() {',
				'  return <ConsentBanner />;',
				'}',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});
		const globalsCss = await readProjectFile(root, 'app/globals.css');
		const layout = await readProjectFile(root, 'app/layout.tsx');

		expect(result.errors).toHaveLength(0);
		expect(result.changedFiles).toHaveLength(2);
		expect(globalsCss).toContain(
			'@tailwind components;\n@import "@c15t/nextjs/styles.tw3.css";\n@tailwind utilities;'
		);
		expect(layout).not.toContain('@c15t/nextjs/styles.css');
		expect(
			result.changedFiles.some((file) =>
				file.summaries.includes("removed JS import '@c15t/nextjs/styles.css'")
			)
		).toBe(true);
	});

	it('adds both base and IAB imports in order to the CSS entrypoint', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import './index.css';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/index.css': ':root { color: #111827; }\n',
			'src/app.tsx': [
				"import { ConsentBanner } from '@c15t/react';",
				"import { IABConsentBanner } from '@c15t/react/iab';",
				'',
				'export function App() {',
				'  return <>',
				'    <ConsentBanner />',
				'    <IABConsentBanner />',
				'  </>;',
				'}',
			].join('\n'),
		});

		await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});
		const indexCss = await readProjectFile(root, 'src/index.css');

		expect(indexCss).toContain(
			'@import "@c15t/react/styles.css";\n@import "@c15t/react/iab/styles.css";'
		);
	});

	it('is idempotent when the correct CSS import already exists', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import './index.css';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/index.css': [
				'@import "@c15t/react/styles.css";',
				'',
				':root { color: #111827; }',
			].join('\n'),
			'src/app.tsx': [
				"import { ConsentBanner } from '@c15t/react';",
				'export function App() { return <ConsentBanner />; }',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it('reports changes during dry runs without writing files', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import '@c15t/react/styles.css';",
				"import './index.css';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/index.css': ':root { color: #111827; }\n',
			'src/app.tsx': [
				"import { ConsentBanner } from '@c15t/react';",
				'export function App() { return <ConsentBanner />; }',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: true,
		});
		const mainTsx = await readProjectFile(root, 'src/main.tsx');
		const indexCss = await readProjectFile(root, 'src/index.css');

		expect(result.changedFiles).toHaveLength(2);
		expect(mainTsx).toContain("import '@c15t/react/styles.css';");
		expect(indexCss).not.toContain('@c15t/react/styles.css');
	});

	it('skips headless-only projects', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import './index.css';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/index.css': ':root { color: #111827; }\n',
			'src/app.tsx': [
				"import { useConsentManager } from '@c15t/react/headless';",
				'',
				'export function App() {',
				'  const store = useConsentManager();',
				'  return <div>{String(Boolean(store))}</div>;',
				'}',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it('returns an actionable error when no global CSS entrypoint exists', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/app.tsx': [
				"import { ConsentBanner } from '@c15t/react';",
				'export function App() { return <ConsentBanner />; }',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.error).toContain(
			'No suitable global CSS entrypoint found.'
		);
		expect(result.errors[0]?.error).toContain('src/index.css');
		expect(result.errors[0]?.error).toContain('src/styles.css');
	});
});
