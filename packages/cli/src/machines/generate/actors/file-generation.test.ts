import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it, vi } from 'vitest';
import { createActor, toPromise } from 'xstate';

import { TAILWIND3_CREATE_REACT_APP_WARNING } from '~/commands/shared/postcss-config';
import { detectFramework } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';

import { fileGenerationActor } from './file-generation';

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

it('shows the Create React App warning for Tailwind 3 without writing a PostCSS config', async () => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-file-generation-'));
	directories.push(root);
	await writeFile(
		join(root, 'package.json'),
		JSON.stringify({
			dependencies: { react: '18.3.1', 'react-scripts': '5.0.1' },
			devDependencies: { tailwindcss: '3.4.17' },
		})
	);
	await mkdir(join(root, 'src'));
	await writeFile(
		join(root, 'src/index.css'),
		'@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'
	);
	await writeFile(
		join(root, 'src/App.jsx'),
		'export default function App() { return <main />; }\n'
	);
	const warn = vi.fn();
	const cliContext = {
		cwd: root,
		framework: await detectFramework(root),
		logger: { debug: vi.fn(), warn },
		projectRoot: root,
	} as unknown as CliContext;

	const actor = createActor(fileGenerationActor, {
		input: {
			backendURL: null,
			cliContext,
			enableDevTools: false,
			enableSSR: false,
			expandedTheme: null,
			mode: 'offline',
			proxyNextjs: false,
			selectedScripts: [],
			uiStyle: 'prebuilt',
			useEnvFile: false,
		},
	});
	actor.start();
	await toPromise(actor);

	expect(warn).toHaveBeenCalledWith(TAILWIND3_CREATE_REACT_APP_WARNING);
	expect(
		(await readdir(root)).filter((name) => name.includes('postcss'))
	).toEqual([]);
}, 30_000);
