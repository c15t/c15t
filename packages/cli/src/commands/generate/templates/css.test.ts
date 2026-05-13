import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { updateAppStylesheetImports } from './css';

const tempDirs: string[] = [];

async function createProject(
	files: Record<string, string>
): Promise<{ root: string }> {
	const root = await mkdtemp(join(tmpdir(), 'c15t-tailwind-css-'));
	tempDirs.push(root);

	for (const [relativePath, content] of Object.entries(files)) {
		const filePath = join(root, relativePath);
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, content, 'utf-8');
	}

	return { root };
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
	);
});

describe('updateAppStylesheetImports', () => {
	it('adds the React stylesheet to src/index.css for non-Tailwind apps', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import './index.css';",
				'',
				'export default function App() {',
				'  return null;',
				'}',
			].join('\n'),
			'src/index.css': ':root { color: #111827; }\n',
		});

		const result = await updateAppStylesheetImports({
			projectRoot: root,
			packageName: '@c15t/react',
			tailwindVersion: null,
			entrypointPath: 'src/main.tsx',
		});
		const content = await readFile(join(root, 'src/index.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(result.filePath).toBe(join(root, 'src/index.css'));
		expect(content).toBe(
			'@import "@c15t/react/styles.css";\n:root { color: #111827; }\n'
		);
	});

	it('inserts the Tailwind v4 stylesheet at the end of the import block', async () => {
		const { root } = await createProject({
			'app/layout.tsx': [
				"import './globals.css';",
				'',
				'export default function RootLayout({ children }: { children: React.ReactNode }) {',
				'  return <html><body>{children}</body></html>;',
				'}',
			].join('\n'),
			'app/globals.css': [
				'@import "tailwindcss";',
				'@import "tw-animate-css";',
				'@import "fumadocs-ui/css/preset.css";',
				'',
				':root { color: #111827; }',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			projectRoot: root,
			packageName: '@c15t/nextjs',
			tailwindVersion: '^4.2.2',
			entrypointPath: 'app/layout.tsx',
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toContain(
			'@import "tailwindcss";\n@import "tw-animate-css";\n@import "fumadocs-ui/css/preset.css";\n@import "@c15t/nextjs/styles.css";'
		);
	});

	it('inserts the Tailwind v3 stylesheet after @tailwind components', async () => {
		const { root } = await createProject({
			'app/layout.tsx': [
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
		});

		const result = await updateAppStylesheetImports({
			projectRoot: root,
			packageName: '@c15t/nextjs',
			tailwindVersion: '3.4.17',
			entrypointPath: 'app/layout.tsx',
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toBe(
			[
				'@tailwind base;',
				'@tailwind components;',
				'@import "@c15t/nextjs/styles.tw3.css";',
				'@tailwind utilities;',
			].join('\n')
		);
	});

	it('adds base and IAB imports in order after a leading comment block', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				"import './styles.css';",
				'',
				'export default function App() {',
				'  return null;',
				'}',
			].join('\n'),
			'src/styles.css': [
				'/* App styles */',
				'',
				':root { color: #111827; }',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			projectRoot: root,
			packageName: '@c15t/react',
			tailwindVersion: null,
			entrypointPath: 'src/main.tsx',
			includeIab: true,
		});
		const content = await readFile(join(root, 'src/styles.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toContain(
			'/* App styles */\n\n@import "@c15t/react/styles.css";\n@import "@c15t/react/iab/styles.css";'
		);
	});

	it('returns searched targets when no CSS entrypoint exists', async () => {
		const { root } = await createProject({
			'src/main.tsx': [
				'export default function App() {',
				'  return null;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			projectRoot: root,
			packageName: '@c15t/react',
			tailwindVersion: null,
			entrypointPath: 'src/main.tsx',
		});

		expect(result.updated).toBe(false);
		expect(result.filePath).toBeNull();
		expect(
			result.searchedPaths.map((filePath) => filePath.replace(`${root}/`, ''))
		).toContain('src/index.css');
	});
});
