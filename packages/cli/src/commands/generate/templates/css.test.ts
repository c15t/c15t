import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { updateAppStylesheetImports } from './css';

const tempDirs: string[] = [];

const createProject = async function createProject(
	files: Record<string, string>
): Promise<{ root: string }> {
	const root = await mkdtemp(join(tmpdir(), 'c15t-tailwind-css-'));
	tempDirs.push(root);

	await Array.from(Object.entries(files)).reduce(
		async (previousIteration, [relativePath, content]) => {
			await previousIteration;
			const filePath = join(root, relativePath);
			await mkdir(dirname(filePath), { recursive: true });
			await writeFile(filePath, content, 'utf-8');
		},
		Promise.resolve()
	);

	return { root };
};

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true }))
	);
});

describe('updateAppStylesheetImports', () => {
	it('adds the React stylesheet to src/index.css for non-Tailwind apps', async () => {
		const { root } = await createProject({
			'src/index.css': ':root { color: #111827; }\n',
			'src/main.tsx': [
				"import './index.css';",
				'',
				'export default function App() {',
				'  return null;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'src/main.tsx',
			packageName: 'c15t/react',
			projectRoot: root,
			tailwindVersion: null,
		});
		const content = await readFile(join(root, 'src/index.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(result.filePath).toBe(join(root, 'src/index.css'));
		expect(content).toBe(
			'@import "c15t/react/styles.css";\n:root { color: #111827; }\n'
		);
	});

	it('inserts the Tailwind v4 stylesheet at the end of the import block', async () => {
		const { root } = await createProject({
			'app/globals.css': [
				'@import "tailwindcss";',
				'@import "tw-animate-css";',
				'@import "fumadocs-ui/css/preset.css";',
				'',
				':root { color: #111827; }',
			].join('\n'),
			'app/layout.tsx': [
				"import './globals.css';",
				'',
				'export default function RootLayout({ children }: { children: React.ReactNode }) {',
				'  return <html><body>{children}</body></html>;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'app/layout.tsx',
			packageName: 'c15t/next',
			projectRoot: root,
			tailwindVersion: '^4.2.2',
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toContain(
			'@import "tailwindcss";\n@import "tw-animate-css";\n@import "fumadocs-ui/css/preset.css";\n@import "c15t/next/styles.css";'
		);
	});

	it('inserts the Tailwind v3 stylesheet after @tailwind components', async () => {
		const { root } = await createProject({
			'app/globals.css': [
				'@tailwind base;',
				'@tailwind components;',
				'@tailwind utilities;',
			].join('\n'),
			'app/layout.tsx': [
				"import './globals.css';",
				'',
				'export default function RootLayout({ children }: { children: React.ReactNode }) {',
				'  return <html><body>{children}</body></html>;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'app/layout.tsx',
			packageName: 'c15t/next',
			projectRoot: root,
			tailwindVersion: '3.4.17',
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toBe(
			[
				'@tailwind base;',
				'@tailwind components;',
				'@import "c15t/next/styles.tw3.css";',
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
			entrypointPath: 'src/main.tsx',
			includeIab: true,
			packageName: 'c15t/react',
			projectRoot: root,
			tailwindVersion: null,
		});
		const content = await readFile(join(root, 'src/styles.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toContain(
			'/* App styles */\n\n@import "c15t/react/styles.css";\n@import "c15t/react/iab/styles.css";'
		);
	});

	it('replaces an existing scoped stylesheet import with the umbrella one', async () => {
		const { root } = await createProject({
			'src/index.css':
				'@import "@c15t/react/styles.css";\n:root { color: #111827; }\n',
			'src/main.tsx': [
				"import './index.css';",
				'',
				'export default function App() {',
				'  return null;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'src/main.tsx',
			packageName: 'c15t/react',
			projectRoot: root,
			tailwindVersion: null,
		});
		const content = await readFile(join(root, 'src/index.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toBe(
			'@import "c15t/react/styles.css";\n:root { color: #111827; }\n'
		);
		expect(result.changes).toEqual([
			'replaced @import "@c15t/react/styles.css"; with @import "c15t/react/styles.css";',
		]);
	});

	it('reports a replacement when normalizing a scoped import across package names', async () => {
		const { root } = await createProject({
			'app/globals.css':
				'@import "@c15t/nextjs/styles.css";\n:root { color: #111827; }\n',
			'app/layout.tsx': [
				"import './globals.css';",
				'',
				'export default function RootLayout({ children }: { children: React.ReactNode }) {',
				'  return <html><body>{children}</body></html>;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'app/layout.tsx',
			packageName: 'c15t/next',
			projectRoot: root,
			tailwindVersion: null,
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toBe(
			'@import "c15t/next/styles.css";\n:root { color: #111827; }\n'
		);
		expect(result.changes).toEqual([
			'replaced @import "@c15t/nextjs/styles.css"; with @import "c15t/next/styles.css";',
		]);
	});

	it('leaves scoped stylesheet imports untouched when the app depends on the scoped package', async () => {
		const cssContent =
			'@import "@c15t/react/styles.css";\n:root { color: #111827; }\n';
		const { root } = await createProject({
			'package.json': JSON.stringify({
				dependencies: { '@c15t/react': '^2.0.0' },
			}),
			'src/index.css': cssContent,
			'src/main.tsx': [
				"import './index.css';",
				'',
				'export default function App() {',
				'  return null;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'src/main.tsx',
			packageName: 'c15t/react',
			projectRoot: root,
			tailwindVersion: null,
		});
		const content = await readFile(join(root, 'src/index.css'), 'utf-8');

		expect(result.updated).toBe(false);
		expect(content).toBe(cssContent);
	});

	it('adds the scoped stylesheet when a scoped app is missing the import', async () => {
		const { root } = await createProject({
			'app/globals.css': ':root { color: #111827; }\n',
			'app/layout.tsx': [
				"import './globals.css';",
				'',
				'export default function RootLayout({ children }: { children: React.ReactNode }) {',
				'  return <html><body>{children}</body></html>;',
				'}',
			].join('\n'),
			'package.json': JSON.stringify({
				dependencies: { '@c15t/nextjs': '^2.0.0' },
			}),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'app/layout.tsx',
			packageName: 'c15t/next',
			projectRoot: root,
			tailwindVersion: null,
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toBe(
			'@import "@c15t/nextjs/styles.css";\n:root { color: #111827; }\n'
		);
	});

	it('still normalizes scoped imports when the app depends on the umbrella package', async () => {
		const { root } = await createProject({
			'package.json': JSON.stringify({
				dependencies: { '@c15t/react': '^2.0.0', c15t: '^3.0.0' },
			}),
			'src/index.css':
				'@import "@c15t/react/styles.css";\n:root { color: #111827; }\n',
			'src/main.tsx': [
				"import './index.css';",
				'',
				'export default function App() {',
				'  return null;',
				'}',
			].join('\n'),
		});

		const result = await updateAppStylesheetImports({
			entrypointPath: 'src/main.tsx',
			packageName: 'c15t/react',
			projectRoot: root,
			tailwindVersion: null,
		});
		const content = await readFile(join(root, 'src/index.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toBe(
			'@import "c15t/react/styles.css";\n:root { color: #111827; }\n'
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
			entrypointPath: 'src/main.tsx',
			packageName: 'c15t/react',
			projectRoot: root,
			tailwindVersion: null,
		});

		expect(result.updated).toBe(false);
		expect(result.filePath).toBeNull();
		expect(
			result.searchedPaths.map((filePath) => filePath.replace(`${root}/`, ''))
		).toContain('src/index.css');
	});
});
