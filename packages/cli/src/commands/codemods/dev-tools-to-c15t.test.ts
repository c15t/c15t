import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanupProjects, createProject } from './__tests__/helpers';
import { runDevToolsToC15tCodemod as codemod } from './dev-tools-to-c15t';

const packageJson = (dependencies: Record<string, string>) =>
	JSON.stringify({ dependencies, name: 'app' });

const run = async function run(
	dependencies: Record<string, string>,
	source: string,
	dryRun = false
) {
	const rootDir = await createProject({
		'package.json': packageJson(dependencies),
		'src/devtools.tsx': source,
	});
	const result = await codemod({ dryRun, projectRoot: rootDir });
	const updated = await readFile(join(rootDir, 'src/devtools.tsx'), 'utf-8');
	return { result, rootDir, updated };
};

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('dev-tools-to-c15t codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('points React dev tools at c15t/next/devtools in a Next.js app and drops namespace', async () => {
		const { result, updated } = await run(
			{ c15t: '3.0.0-alpha.5', next: '^16.0.0' },
			`'use client';

import { DevTools } from '@c15t/dev-tools/react';

// Only in development.
export const ConsentDevTools = () => (
	<DevTools namespace="c15tStore" position="bottom-left" />
);
`
		);

		expect(result.errors).toEqual([]);
		expect(updated).toBe(`'use client';

import { DevTools } from 'c15t/next/devtools';

// Only in development.
export const ConsentDevTools = () => (
	<DevTools position="bottom-left" />
);
`);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'@c15t/dev-tools/react -> c15t/next/devtools',
			'removed namespace prop',
		]);
	});

	it('uses c15t/react/devtools for the TanStack panel outside Next.js', async () => {
		const { updated } = await run(
			{ c15t: 'alpha', react: '^19.0.0' },
			`import {
	C15tTanStackDevtoolsPanel as Panel,
	c15tDevtools,
} from '@c15t/dev-tools/tanstack';

export const plugins = [c15tDevtools({ namespace: 'consent', defaultOpen: true })];
export const panel = <Panel namespace="consent" />;
`
		);

		expect(updated).toBe(`import {
	C15tTanStackDevtoolsPanel as Panel,
	c15tDevtools,
} from 'c15t/react/devtools';

export const plugins = [c15tDevtools({ defaultOpen: true })];
export const panel = <Panel />;
`);
	});

	it('keeps scoped packages when the app has not installed c15t v3', async () => {
		const { updated } = await run(
			{ '@c15t/nextjs': '^2.3.0', next: '^15.0.0' },
			`export { DevTools } from '@c15t/dev-tools/react';
const lazy = () => import('@c15t/dev-tools/react');
`
		);
		expect(updated).toBe(`export { DevTools } from '@c15t/nextjs/devtools';
const lazy = () => import('@c15t/nextjs/devtools');
`);
	});

	it('marks removed store helpers from the dev tools root', async () => {
		const { updated } = await run(
			{ c15t: '3.0.0' },
			`import { createDevTools, getC15tStore } from '@c15t/dev-tools';
`
		);
		expect(updated)
			.toBe(`// TODO(c15t v3): getC15tStore was removed. Dev tools read the consent engine; render DevTools inside the provider, or call createDevTools({ kernel }).
import { createDevTools, getC15tStore } from '@c15t/dev-tools';
`);
	});

	it('leaves v3 imports and other packages alone', async () => {
		const { result } = await run(
			{ c15t: '3.0.0' },
			`import { DevTools } from 'c15t/react/devtools';
import { createDevTools } from '@c15t/dev-tools';
import { Panel } from './dev-tools/react';
`
		);
		expect(result.changedFiles).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const source = `import { DevTools } from '@c15t/dev-tools/react';
export const Tools = () => <DevTools namespace="x" />;
`;
		const dry = await run({ c15t: '3.0.0' }, source, true);
		expect(dry.updated).toBe(source);
		expect(dry.result.changedFiles[0]?.after).toContain(
			"from 'c15t/react/devtools'"
		);

		const applied = await run({ c15t: '3.0.0' }, source);
		const again = await codemod({
			dryRun: false,
			projectRoot: applied.rootDir,
		});
		expect(again.changedFiles).toEqual([]);
	});
});
