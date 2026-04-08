import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runAddStylesheetImportsCodemod } from './add-stylesheet-imports';

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

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
	);
});

describe('add-stylesheet-imports codemod', () => {
	it('uses the Tailwind 3 stylesheet entrypoint when tailwindcss v3 is installed', async () => {
		const { root } = await createProject({
			'package.json': JSON.stringify({
				name: 'tw3-next-app',
				dependencies: {
					'@c15t/nextjs': '2.0.0-rc.6',
					next: '15.3.3',
					react: '19.2.3',
					'react-dom': '19.2.3',
				},
				devDependencies: {
					tailwindcss: '3.4.17',
				},
			}),
			'app/layout.tsx': `
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return <html><body>{children}</body></html>;
}
`,
			'app/provider.tsx': `
import { ConsentBanner } from '@c15t/nextjs';

export function Provider() {
	return <ConsentBanner />;
}
`,
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});
		const layout = await readFile(join(root, 'app/layout.tsx'), 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(layout).toContain("import '@c15t/nextjs/styles.tw3.css';");
		expect(layout).not.toContain("import '@c15t/nextjs/styles.css';");
	});

	it('keeps the default stylesheet entrypoint for non-Tailwind-3 projects', async () => {
		const { root } = await createProject({
			'package.json': JSON.stringify({
				name: 'react-app',
				dependencies: {
					'@c15t/react': '2.0.0-rc.6',
					react: '19.2.3',
					'react-dom': '19.2.3',
				},
				devDependencies: {
					tailwindcss: '4.2.2',
				},
			}),
			'src/main.tsx': `
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConsentBanner } from '@c15t/react';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ConsentBanner />
	</StrictMode>
);
`,
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});
		const main = await readFile(join(root, 'src/main.tsx'), 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(main).toContain("import '@c15t/react/styles.css';");
		expect(main).not.toContain('styles.tw3.css');
	});

	it('replaces the default import with the Tailwind 3 import when needed', async () => {
		const { root } = await createProject({
			'package.json': JSON.stringify({
				name: 'tw3-react-app',
				dependencies: {
					'@c15t/react': '2.0.0-rc.6',
					react: '19.2.3',
					'react-dom': '19.2.3',
				},
				devDependencies: {
					tailwindcss: '^3.4.17',
				},
			}),
			'src/main.tsx': `
import '@c15t/react/styles.css';
import { ConsentBanner } from '@c15t/react';

export function App() {
	return <ConsentBanner />;
}
`,
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: root,
			dryRun: false,
		});
		const main = await readFile(join(root, 'src/main.tsx'), 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(main).toContain("import '@c15t/react/styles.tw3.css';");
		expect(main).not.toContain("import '@c15t/react/styles.css';");
	});
});
