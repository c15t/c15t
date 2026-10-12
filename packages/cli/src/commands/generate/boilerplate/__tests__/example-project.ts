import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root. */
export const repositoryRoot = fileURLToPath(
	new URL('../../../../../../../', import.meta.url)
);

/** An example app's directory, which has the framework installed. */
export const exampleDirectory = (example: string): string =>
	join(repositoryRoot, 'examples', example);

const compiler = join(
	dirname(createRequire(import.meta.url).resolve('typescript/package.json')),
	'bin/tsc'
);

/**
 * Write files into a scratch directory inside an example app, so imports
 * resolve through the app's installed framework and the workspace's built
 * c15t packages, and remove it afterwards.
 * @param example Example app name, such as `nextjs`.
 * @param files Files relative to the scratch directory.
 * @param run Receives the scratch directory.
 * @returns What `run` returns.
 */
export const inExample = async <Result>(
	example: string,
	files: Record<string, string>,
	run: (directory: string) => Result | Promise<Result>,
	{ outsideNodeModules = false } = {}
): Promise<Result> => {
	// node_modules/.cache keeps the files out of git and coverage scans.
	// svelte-check skips anything under node_modules, so it gets a hidden
	// directory in the example instead.
	const cache = outsideNodeModules
		? exampleDirectory(example)
		: join(exampleDirectory(example), 'node_modules/.cache');
	mkdirSync(cache, { recursive: true });
	const directory = mkdtempSync(join(cache, '.c15t-cli-'));
	try {
		for (const [name, content] of Object.entries(files)) {
			mkdirSync(dirname(join(directory, name)), { recursive: true });
			writeFileSync(join(directory, name), content);
		}
		return await run(directory);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
};

/** The checker to run: TypeScript, or the framework's own for its components. */
export type Checker = 'tsc' | 'vue-tsc' | 'svelte-check';

const checkerCommand = (
	checker: Checker,
	example: string,
	directory: string
): string[] => {
	const project = join(directory, 'tsconfig.json');
	if (checker === 'vue-tsc') {
		return [
			join(exampleDirectory(example), 'node_modules/vue-tsc/bin/vue-tsc.js'),
			'--project',
			project,
			'--pretty',
			'false',
		];
	}
	if (checker === 'svelte-check') {
		return [
			join(
				exampleDirectory(example),
				'node_modules/svelte-check/bin/svelte-check'
			),
			'--workspace',
			directory,
			'--tsconfig',
			project,
			'--output',
			'human',
			'--threshold',
			'error',
		];
	}
	return [compiler, '--project', project, '--pretty', 'false'];
};

/**
 * Typecheck generated files inside an example app.
 * @param example Example app name.
 * @param files Generated files. Scripts and, for `vue-tsc` and
 * `svelte-check`, components are checked; others are written for imports
 * to resolve.
 * @param compilerOptions Options merged over strict bundler defaults.
 * @param checker The checker to run. Defaults to the CLI's TypeScript.
 * @returns Checker output, empty when the files typecheck.
 */
export const typecheckInExample = (
	example: string,
	files: Record<string, string>,
	compilerOptions: Record<string, unknown> = {},
	checker: Checker = 'tsc'
): Promise<string> =>
	inExample(
		example,
		{
			...files,
			'c15t-test-env.d.ts': `declare module '*.css';
declare module '*.vue' {
	const component: import('vue').DefineComponent;
	export default component;
}
`,
		},
		(directory) => {
			const checked = [
				'c15t-test-env.d.ts',
				...Object.keys(files).filter(
					(name) =>
						/\.(?:m?ts|tsx|mjs)$/u.test(name) ||
						(checker === 'vue-tsc' && name.endsWith('.vue')) ||
						(checker === 'svelte-check' && name.endsWith('.svelte'))
				),
			];
			writeFileSync(
				join(directory, 'tsconfig.json'),
				JSON.stringify({
					compilerOptions: {
						allowJs: true,
						checkJs: true,
						jsx: 'react-jsx',
						lib: ['ES2022', 'DOM', 'DOM.Iterable'],
						module: 'ESNext',
						moduleResolution: 'Bundler',
						noEmit: true,
						noUncheckedIndexedAccess: true,
						skipLibCheck: true,
						strict: true,
						target: 'ES2022',
						types: [],
						...compilerOptions,
					},
					files: checked,
				})
			);
			const result = spawnSync(
				process.execPath,
				checkerCommand(checker, example, directory),
				{ cwd: directory, encoding: 'utf8', timeout: 90_000 }
			);
			return result.status === 0
				? ''
				: `${result.stdout}${result.stderr}`.replaceAll(directory, '.');
		},
		{ outsideNodeModules: checker === 'svelte-check' }
	);
