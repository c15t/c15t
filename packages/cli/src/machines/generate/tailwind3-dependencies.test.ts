import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromPromise } from 'xstate';

import { createCliContext } from '../../context/creator';
import { c15tReleaseSpecifier } from '../../utils/c15t-release';
import { createCliLogger } from '../../utils/logger';
import { generateMachine } from './machine';

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

/** The dependencies interactive setup checks for a detected framework. */
const dependenciesFor = async function dependenciesFor(
	pkg: string,
	tailwindVersion: string | null
): Promise<string[]> {
	const directory = await mkdtemp(join(tmpdir(), 'c15t-setup-deps-'));
	directories.push(directory);
	await writeFile(join(directory, 'package.json'), '{"private":true}');
	const cliContext = await createCliContext([], directory, [], {
		logger: createCliLogger('error', { write: () => {} }),
		telemetry: false,
	});
	const checked = vi.fn((dependencies: string[]) => dependencies);
	const machine = generateMachine.provide({
		actors: {
			checkDependencies: fromPromise(
				({ input }: { input: { dependencies: string[] } }) => {
					checked(input.dependencies);
					return Promise.resolve({ missing: [] });
				}
			),
			fileGeneration: fromPromise(() =>
				Promise.resolve({
					configPath: null,
					envPath: null,
					filesCreated: [],
					filesModified: [],
					layoutPath: null,
					nextConfigPath: null,
				})
			),
			frontendOptions: fromPromise(() =>
				Promise.resolve({ uiStyle: 'prebuilt' as const })
			),
			preflight: fromPromise(() =>
				Promise.resolve({
					checks: [],
					framework: { ...cliContext.framework, pkg, tailwindVersion },
					packageManager: { name: 'pnpm', version: null },
					passed: true,
					projectRoot: directory,
				})
			),
			scriptsOption: fromPromise(() =>
				Promise.resolve({ addScripts: false, selectedScripts: [] })
			),
		},
	});
	const actor = createActor(machine, {
		input: { cliContext, modeArg: 'offline' },
	});
	actor.start();
	actor.send({ type: 'START' });
	try {
		await vi.waitFor(() => expect(checked).toHaveBeenCalledOnce());
		return checked.mock.calls[0]?.[0] ?? [];
	} finally {
		actor.stop();
	}
};

// The Tailwind 3 PostCSS plugin ships as `c15t/postcss-tailwind3`, so a
// Tailwind 3 app needs no `@c15t/ui` dependency of its own.
it.each([
	{ pkg: 'c15t/next', tailwindVersion: '^3.4.17' },
	{ pkg: 'c15t/react', tailwindVersion: '^3.4.17' },
	{ pkg: 'c15t/react', tailwindVersion: '^4.1.0' },
])(
	'installs only c15t for $pkg with Tailwind $tailwindVersion',
	async ({ pkg, tailwindVersion }) => {
		await expect(dependenciesFor(pkg, tailwindVersion)).resolves.toEqual([
			`c15t@${c15tReleaseSpecifier()}`,
		]);
	}
);
