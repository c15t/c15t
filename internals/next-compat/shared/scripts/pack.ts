/**
 * Installs the `@c15t/nextjs` dependency closure into one cell's
 * `node_modules` the way npm would: packed tarballs extracted as real
 * directories, third-party dependencies linked beside them, and a copy of the
 * shared fixture package so its imports resolve from the same tree.
 *
 * Why: both bundlers decide "installed dependency or first-party code" by the
 * real path, and the Pages Router `require`s installed packages at runtime,
 * so peers such as `next` must resolve upward from the package to the cell's
 * own copy. A workspace symlink into `packages/react/dist` fails both tests:
 * webpack runs its React Server Components checks on it, Turbopack refuses
 * the global CSS imports in `@c15t/ui`, and `next` resolves to whatever the
 * monorepo hoisted. Extracting under `<cell>/node_modules` gives the packages
 * a real install path, and proves `files` and `exports` publish what the
 * cells consume.
 *
 * Usage: `bun ../shared/scripts/pack.ts` from a cell directory (its `build`
 * script), or with the cell directory as the first argument.
 */

import { spawnSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharedDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(sharedDir, '../../..');
const packagesDir = join(repoRoot, 'packages');
const ROOT_PACKAGE = '@c15t/nextjs';
const SHARED_PACKAGE = '@c15t/next-compat-shared';

interface PackageManifest {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
}

const readManifest = function readManifest(dir: string): PackageManifest {
	return JSON.parse(
		readFileSync(join(dir, 'package.json'), 'utf8')
	) as PackageManifest;
};

const indexWorkspacePackages = function indexWorkspacePackages(): Map<
	string,
	string
> {
	const index = new Map<string, string>();
	for (const entry of readdirSync(packagesDir)) {
		const dir = join(packagesDir, entry);
		if (!existsSync(join(dir, 'package.json'))) {
			continue;
		}
		index.set(readManifest(dir).name, dir);
	}
	return index;
};

const collectClosure = function collectClosure(
	index: Map<string, string>
): string[] {
	const seen = new Set<string>();
	const visit = function visit(name: string) {
		const dir = index.get(name);
		if (!dir || seen.has(name)) {
			return;
		}
		seen.add(name);
		for (const dependency of Object.keys(
			readManifest(dir).dependencies ?? {}
		)) {
			visit(dependency);
		}
	};
	visit(ROOT_PACKAGE);
	return [...seen];
};

const run = function run(command: string, args: string[], cwd: string) {
	const result = spawnSync(command, args, { cwd, stdio: 'pipe' });
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed in ${cwd}\n` +
				`${String(result.stdout)}${String(result.stderr)}`
		);
	}
	return String(result.stdout).trim();
};

const packOne = function packOne(dir: string, tarballDir: string): string {
	// `--ignore-scripts`: some packages rebuild themselves in `prepack`, and
	// the artifact check runs in the release flow; here the built `dist` is
	// what Turbo just produced.
	const output = run(
		'bun',
		['pm', 'pack', '--quiet', '--ignore-scripts', '--destination', tarballDir],
		dir
	);
	// `--quiet` prints the tarball path; older versions print just the name.
	const name = output.split('\n').at(-1) ?? '';
	const tarball = name.startsWith('/') ? name : join(tarballDir, name);
	if (!name || !existsSync(tarball)) {
		throw new Error(`bun pm pack produced no tarball for ${dir}: ${output}`);
	}
	return tarball;
};

const replaceWithDirectory = function replaceWithDirectory(path: string) {
	if (existsSync(path) || lstatSync(path, { throwIfNoEntry: false })) {
		rmSync(path, { force: true, recursive: true });
	}
	mkdirSync(path, { recursive: true });
};

const extract = function extract(tarball: string, target: string) {
	replaceWithDirectory(target);
	run('tar', ['-xzf', tarball, '--strip-components=1', '-C', target], repoRoot);
};

/**
 * Finds where Bun installed `name` for the package at `fromDir` by walking
 * up through `node_modules` directories, the way Node resolution does.
 */
const findInstalled = function findInstalled(
	name: string,
	fromDir: string
): string | undefined {
	let current = fromDir;
	for (;;) {
		const candidate = join(current, 'node_modules', name);
		if (existsSync(join(candidate, 'package.json'))) {
			return realpathSync(candidate);
		}
		const parent = dirname(current);
		if (parent === current) {
			return undefined;
		}
		current = parent;
	}
};

/**
 * An install puts each package's third-party dependencies next to it. Bun
 * nests some of them under `packages/<name>/node_modules` instead, which the
 * extracted copies cannot see, so link every non-workspace runtime dependency
 * of the closure into the cell. Links point at the real store path, which
 * keeps `node_modules` in the path the bundlers inspect.
 */
const linkThirdPartyDependencies = function linkThirdPartyDependencies(
	cellModules: string,
	closure: string[],
	index: Map<string, string>
) {
	for (const name of closure) {
		const dir = index.get(name);
		if (!dir) {
			continue;
		}
		for (const dependency of Object.keys(
			readManifest(dir).dependencies ?? {}
		)) {
			if (index.has(dependency)) {
				continue;
			}
			const linkPath = join(cellModules, dependency);
			if (lstatSync(linkPath, { throwIfNoEntry: false })) {
				continue;
			}
			const installed = findInstalled(dependency, dir);
			if (!installed) {
				throw new Error(
					`${name} depends on ${dependency}, which is not installed`
				);
			}
			mkdirSync(dirname(linkPath), { recursive: true });
			symlinkSync(installed, linkPath, 'dir');
		}
	}
};

/**
 * The shared fixture package is consumed as TypeScript source through
 * `transpilePackages`; a copy inside the cell makes its own `@c15t/*`
 * imports resolve to the extracted packages instead of the workspace links.
 */
const copyShared = function copyShared(cellModules: string) {
	const target = join(cellModules, SHARED_PACKAGE);
	replaceWithDirectory(target);
	for (const entry of ['package.json', 'tsconfig.json', 'src']) {
		cpSync(join(sharedDir, entry), join(target, entry), {
			// The Vitest side (config, global setup, suite) loads from the
			// workspace source; Node refuses to strip TypeScript under
			// node_modules, so keep it out of the copy.
			filter: (source) => !source.includes(`${sep}suite`),
			recursive: true,
		});
	}
};

const main = function main() {
	const cellDir = resolve(process.argv[2] ?? process.cwd());
	if (!existsSync(join(cellDir, 'next.config.ts'))) {
		throw new Error(`${cellDir} is not a compatibility cell`);
	}
	const cellModules = join(cellDir, 'node_modules');
	const tarballDir = join(cellModules, '.next-compat-tarballs');
	const index = indexWorkspacePackages();
	const closure = collectClosure(index);

	rmSync(tarballDir, { force: true, recursive: true });
	mkdirSync(tarballDir, { recursive: true });
	for (const name of closure) {
		const dir = index.get(name);
		if (dir) {
			extract(packOne(dir, tarballDir), join(cellModules, name));
		}
	}
	linkThirdPartyDependencies(cellModules, closure, index);
	copyShared(cellModules);
	// webpack's persistent cache treats node_modules as immutable unless the
	// package version changes, so a re-packed package with the same version
	// would be served stale from `.next/cache`. Turbopack keeps its own cache
	// there too. Drop it whenever the packages are reinstalled.
	rmSync(join(cellDir, '.next', 'cache'), { force: true, recursive: true });

	console.log(
		`[next-compat] installed ${closure.length} packed packages and ` +
			`${SHARED_PACKAGE} into ${relative(repoRoot, cellModules)}`
	);
};

main();
