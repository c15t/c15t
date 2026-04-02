import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runAddStylesheetImportsCodemod } from '../../src/commands/codemods/add-stylesheet-imports';

let fixtureDir: string;

async function createFixture(files: Record<string, string>): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'codemod-test-'));
	for (const [filePath, content] of Object.entries(files)) {
		const full = join(dir, filePath);
		await mkdir(dirname(full), { recursive: true });
		await writeFile(full, content);
	}
	return dir;
}

beforeEach(() => {
	fixtureDir = '';
});

afterEach(async () => {
	if (fixtureDir) {
		await rm(fixtureDir, { recursive: true, force: true });
	}
});

describe('add-stylesheet-imports codemod', () => {
	it('adds styles.css import for React styled app', async () => {
		fixtureDir = await createFixture({
			'src/main.tsx': [
				"import React from 'react';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/app.tsx': [
				"import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';",
				'',
				'export function App() {',
				'  return (',
				"    <ConsentManagerProvider options={{ mode: 'offline' }}>",
				'      <ConsentBanner />',
				'    </ConsentManagerProvider>',
				'  );',
				'}',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: fixtureDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(1);
		expect(result.changedFiles[0]?.filePath).toContain('main.tsx');
		expect(result.changedFiles[0]?.summaries).toContain(
			"added import '@c15t/react/styles.css'"
		);
		expect(result.errors).toHaveLength(0);

		const content = await readFile(join(fixtureDir, 'src/main.tsx'), 'utf-8');
		expect(content).toContain("import '@c15t/react/styles.css';");
	});

	it('adds styles.css import for Next.js app', async () => {
		fixtureDir = await createFixture({
			'app/layout.tsx': [
				"import { ConsentBanner, ConsentManagerProvider } from '@c15t/nextjs';",
				'',
				'export default function RootLayout({ children }: { children: React.ReactNode }) {',
				'  return (',
				'    <html>',
				'      <body>',
				"        <ConsentManagerProvider options={{ mode: 'offline' }}>",
				'          <ConsentBanner />',
				'          {children}',
				'        </ConsentManagerProvider>',
				'      </body>',
				'    </html>',
				'  );',
				'}',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: fixtureDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(1);
		expect(result.changedFiles[0]?.filePath).toContain('layout.tsx');
		expect(result.changedFiles[0]?.summaries).toContain(
			"added import '@c15t/nextjs/styles.css'"
		);

		const content = await readFile(join(fixtureDir, 'app/layout.tsx'), 'utf-8');
		expect(content).toContain("import '@c15t/nextjs/styles.css';");
	});

	it('adds both styles.css and iab/styles.css for IAB usage', async () => {
		fixtureDir = await createFixture({
			'src/main.tsx': [
				"import React from 'react';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/app.tsx': [
				"import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';",
				"import { IABConsentBanner } from '@c15t/react/iab';",
				'',
				'export function App() {',
				'  return (',
				"    <ConsentManagerProvider options={{ mode: 'offline' }}>",
				'      <ConsentBanner />',
				'      <IABConsentBanner />',
				'    </ConsentManagerProvider>',
				'  );',
				'}',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: fixtureDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(1);
		expect(result.changedFiles[0]?.summaries).toContain(
			"added import '@c15t/react/styles.css'"
		);
		expect(result.changedFiles[0]?.summaries).toContain(
			"added import '@c15t/react/iab/styles.css'"
		);

		const content = await readFile(join(fixtureDir, 'src/main.tsx'), 'utf-8');
		expect(content).toContain("import '@c15t/react/styles.css';");
		expect(content).toContain("import '@c15t/react/iab/styles.css';");
	});

	it('skips headless-only projects', async () => {
		fixtureDir = await createFixture({
			'src/main.tsx': [
				"import React from 'react';",
				"import { App } from './app';",
				'',
				'export default App;',
			].join('\n'),
			'src/app.tsx': [
				"import { useConsentManager } from '@c15t/react/headless';",
				'',
				'export function App() {',
				'  const { hasConsent } = useConsentManager();',
				'  return <div>{String(hasConsent)}</div>;',
				'}',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: fixtureDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it('is idempotent when import already exists', async () => {
		fixtureDir = await createFixture({
			'src/main.tsx': [
				"import React from 'react';",
				"import '@c15t/react/styles.css';",
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
			projectRoot: fixtureDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(0);

		const content = await readFile(join(fixtureDir, 'src/main.tsx'), 'utf-8');
		const matches = content.match(/@c15t\/react\/styles\.css/g);
		expect(matches).toHaveLength(1);
	});

	it('returns error when no entrypoint found', async () => {
		fixtureDir = await createFixture({
			'src/components/banner.tsx': [
				"import { ConsentBanner } from '@c15t/react';",
				'export function Banner() { return <ConsentBanner />; }',
			].join('\n'),
		});

		const result = await runAddStylesheetImportsCodemod({
			projectRoot: fixtureDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.error).toContain('No root entrypoint found');
	});

	it('reports changes but does not write in dry run', async () => {
		fixtureDir = await createFixture({
			'src/main.tsx': [
				"import React from 'react';",
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
			projectRoot: fixtureDir,
			dryRun: true,
		});

		expect(result.changedFiles).toHaveLength(1);
		expect(result.changedFiles[0]?.summaries).toContain(
			"added import '@c15t/react/styles.css'"
		);

		// File should NOT have been modified on disk
		const content = await readFile(join(fixtureDir, 'src/main.tsx'), 'utf-8');
		expect(content).not.toContain('@c15t/react/styles.css');
	});
});
