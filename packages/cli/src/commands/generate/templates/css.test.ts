import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { updateAppStylesheetImports } from './css';
import { collectFileEdits } from './shared/file-plan';

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
	it('reports only a reset change when the import is already correct', async () => {
		const { root } = await createProject({
			'app/globals.css':
				'@import "c15t/next/styles.css";\n* { padding: 0; margin: 0; }\n',
		});
		const result = await updateAppStylesheetImports({
			packageName: 'c15t/next',
			projectRoot: root,
		});
		expect(result.changes).toEqual([
			'moved the universal spacing reset into @layer base',
		]);
	});
	it('skips aliases outside the project and plans an internal fallback', async () => {
		const { root: workspace } = await createProject({
			'app/app/globals.css': 'body { color: black; }\n',
			'app/app/layout.tsx': "import '@/globals.css';",
			'app/tsconfig.json': JSON.stringify({
				compilerOptions: { baseUrl: '.', paths: { '@/*': ['../shared/*'] } },
			}),
			'shared/globals.css': '* { padding: 0; margin: 0; }\n',
		});
		const root = join(workspace, 'app');
		const { result, edits } = await collectFileEdits(
			() =>
				updateAppStylesheetImports({
					entrypointPath: 'app/layout.tsx',
					packageName: 'c15t/next',
					projectRoot: root,
				}),
			{ projectRoot: root }
		);
		expect(result.filePath).toBe(join(root, 'app/globals.css'));
		expect(edits).toHaveLength(1);
		expect(await readFile(join(workspace, 'shared/globals.css'), 'utf8')).toBe(
			'* { padding: 0; margin: 0; }\n'
		);
	});
	it('plans a plain CSS reset without writing and preserves CRLF on apply', async () => {
		const original = '* {\r\n\tpadding: 0;\r\n\tmargin: 0;\r\n}\r\n';
		const { root } = await createProject({ 'app/globals.css': original });
		const options = { packageName: 'c15t/next' as const, projectRoot: root };
		const plan = await updateAppStylesheetImports({ ...options, dryRun: true });
		expect(plan.changes).toContain(
			'moved the universal spacing reset into @layer base'
		);
		expect(await readFile(join(root, 'app/globals.css'), 'utf8')).toBe(
			original
		);
		await updateAppStylesheetImports(options);
		const css = await readFile(join(root, 'app/globals.css'), 'utf8');
		expect(css).toContain('@layer base');
		expect(css.replaceAll('\r\n', '')).not.toContain('\n');
	});
	it('puts a starter universal reset below layered component styles', async () => {
		const { root } = await createProject({
			'app/globals.css':
				'@import "tailwindcss";\n\n* {\n  box-sizing: border-box;\n  padding: 0;\n  margin: 0;\n}\n\n.page { padding: 24px; }\n',
			'package.json': JSON.stringify({
				devDependencies: { tailwindcss: '^4.1.0' },
			}),
		});
		const options = { packageName: 'c15t/next' as const, projectRoot: root };
		const result = await updateAppStylesheetImports(options);
		const css = await readFile(join(root, 'app/globals.css'), 'utf8');
		expect(css).toMatch(/@layer base\s*\{\s*\*\s*\{/u);
		expect(css).toContain('.page { padding: 24px; }');
		expect(result.changes).toContain(
			'moved the universal spacing reset into @layer base'
		);
		expect((await updateAppStylesheetImports(options)).updated).toBe(false);
	});
	it.each([
		'@layer base { * { padding: 0; margin: 0; } }',
		'/* * { padding: 0; margin: 0; } */',
		'.page * { padding: 0; margin: 0; }',
		'* { padding: 4px; margin: 0; }',
		'* { padding: 0 !important; margin: 0; }',
		'* { padding: 0; margin: 0; color: red; }',
		'@media (width > 600px) { * { padding: 0; margin: 0; } }',
	])('preserves custom or already layered rules: %s', async (rule) => {
		const { root } = await createProject({ 'app/globals.css': `${rule}\n` });
		await updateAppStylesheetImports({
			packageName: 'c15t/next',
			projectRoot: root,
		});
		expect(await readFile(join(root, 'app/globals.css'), 'utf8')).toContain(
			rule
		);
	});
	it.each(['^3.4.17', '>=3.4.17 <4', '<4 >=3.4.17', '3.3 - 3.4'])(
		'keeps Tailwind 3 resets unlayered for %s',
		async (version) => {
			const rule = '* { padding: 0; margin: 0; }';
			const { root } = await createProject({
				'app/globals.css': `${rule}\n`,
				'package.json': JSON.stringify({
					devDependencies: { tailwindcss: version },
				}),
			});
			await updateAppStylesheetImports({
				packageName: 'c15t/next',
				projectRoot: root,
			});
			expect(
				await readFile(join(root, 'app/globals.css'), 'utf8')
			).not.toContain('@layer base');
		}
	);
	it.each([
		{
			config: {},
			entry: "import '../styles/site.css'",
			name: 'semicolon-free import',
		},
		{
			config: {},
			entry: "import '../styles/site.css'; // global styles",
			name: 'trailing comment',
		},
		{
			config: {
				'tsconfig.json':
					'{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }',
			},
			entry: "import '@/styles/site.css';",
			name: 'tsconfig alias',
		},
		{
			config: {
				'jsconfig.json':
					'{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./*"] } } }',
			},
			entry: "import '@/styles/site.css';",
			name: 'jsconfig alias',
		},
		{
			config: {
				'config/base.json':
					'{ "compilerOptions": { "paths": { "@/*": ["../*"] } } }',
				'tsconfig.json': '{ "extends": "./config/base.json" }',
			},
			entry: "import '@/styles/site.css';",
			name: 'inherited alias',
		},
	])('finds the loaded stylesheet with $name', async ({ entry, config }) => {
		const { root } = await createProject({
			...config,
			'app/layout.tsx': `${entry}\nexport default function Layout() { return null; }`,
			'styles/site.css': '@import "tailwindcss";\n',
		});
		const result = await updateAppStylesheetImports({
			entrypointPath: 'app/layout.tsx',
			packageName: 'c15t/next',
			projectRoot: root,
		});
		expect(result.filePath).toBe(join(root, 'styles/site.css'));
		expect(await readFile(join(root, 'styles/site.css'), 'utf8')).toContain(
			'@import "c15t/next/styles.css";'
		);
	});
	it('ignores CSS module imports and commented-out imports', async () => {
		const { root } = await createProject({
			'app/layout.tsx':
				"// import '../styles/unused.css';\nimport styles from '../styles/layout.module.css';\nimport '../styles/site.css'\nexport default function Layout() { return null; }",
			'styles/layout.module.css': '/* untouched */',
			'styles/site.css': '@import "tailwindcss";\n',
			'styles/unused.css': '/* untouched */',
		});
		const options = {
			entrypointPath: 'app/layout.tsx',
			packageName: 'c15t/next' as const,
			projectRoot: root,
		};
		expect((await updateAppStylesheetImports(options)).filePath).toBe(
			join(root, 'styles/site.css')
		);
		expect((await updateAppStylesheetImports(options)).updated).toBe(false);
		expect(await readFile(join(root, 'styles/unused.css'), 'utf8')).toBe(
			'/* untouched */'
		);
		expect(await readFile(join(root, 'styles/layout.module.css'), 'utf8')).toBe(
			'/* untouched */'
		);
	});
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
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toContain(
			'@import "tailwindcss";\n@import "tw-animate-css";\n@import "fumadocs-ui/css/preset.css";\n@import "c15t/next/styles.css";'
		);
	});

	it('puts the stylesheet above the Tailwind v3 directives', async () => {
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
		});
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result.updated).toBe(true);
		expect(content).toBe(
			[
				'@import "c15t/next/styles.css";',
				'@tailwind base;',
				'@tailwind components;',
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
		});

		expect(result.updated).toBe(false);
		expect(result.filePath).toBeNull();
		expect(
			result.searchedPaths.map((filePath) => filePath.replace(`${root}/`, ''))
		).toContain('src/index.css');
	});
});
