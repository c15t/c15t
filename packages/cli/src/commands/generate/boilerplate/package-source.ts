/* oxlint-disable no-await-in-loop -- Pack each snapshot sequentially and report the first incomplete package. */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { z } from 'zod';

import type { FileEdit } from '../templates/shared/file-plan';

const execute = promisify(execFile);
const cacheDirectory = 'node_modules/.cache/c15t-cli-packages';
const stringMap = z.record(z.string(), z.string());
const packageSchema = z
	.object({
		dependencies: stringMap.optional(),
		devDependencies: stringMap.optional(),
		exports: z.unknown().optional(),
		main: z.string().optional(),
		name: z.string(),
		optionalDependencies: stringMap.optional(),
		peerDependencies: stringMap.optional(),
		peerDependenciesMeta: z
			.record(z.string(), z.object({ optional: z.boolean().optional() }))
			.optional(),
		types: z.string().optional(),
		version: z.string(),
	})
	.passthrough();
type PackageManifest = z.infer<typeof packageSchema>;
const preparedSchema = z.object({
	closure: z.array(z.string()),
	packageSource: z.string(),
	packages: z.record(
		z.string(),
		z.object({
			sha256: z.string(),
			tarball: z.string(),
			version: z.string(),
		})
	),
	preparedAt: z.string(),
	roots: z.array(z.string()),
	schemaVersion: z.literal(1),
});
type PreparedPackages = z.infer<typeof preparedSchema>;
interface WorkspacePackage {
	directory: string;
	manifest: PackageManifest;
}

export interface BoilerplateDependencyPlan {
	dependencies: { name: string; specifier: string | null }[];
	edits: FileEdit[];
	instructions: string[];
	source:
		| { kind: 'files-only' }
		| {
				kind: 'local-unpublished';
				packageSource: string;
				preparedAt: string;
		  };
}

const readJson = async (file: string): Promise<unknown> =>
	JSON.parse(await fs.readFile(file, 'utf8'));
const digest = async (file: string): Promise<string> =>
	createHash('sha256')
		.update(await fs.readFile(file))
		.digest('hex');
const inside = (directory: string, file: string): boolean => {
	const relative = path.relative(directory, file);
	return (
		relative !== '..' &&
		!relative.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relative)
	);
};
const prepareInstruction = (names: string[]): string =>
	`From the checkout root, run bun scripts/prepare-cli-packages.ts ${names.join(' ')} after building those packages.`;

const readCheckout = async (
	root: string
): Promise<Map<string, WorkspacePackage>> => {
	const source = await fs.realpath(root);
	const workspace = z
		.object({ name: z.literal('c15t-workspace') })
		.safeParse(await readJson(path.join(source, 'package.json')));
	if (!workspace.success) {
		throw new Error('--package-source must point to the c15t checkout root.');
	}
	const directories = await fs.readdir(path.join(source, 'packages'), {
		withFileTypes: true,
	});
	const entries = await Promise.all(
		directories
			.filter((entry) => entry.isDirectory())
			.map(async (entry) => {
				const directory = path.join(source, 'packages', entry.name);
				try {
					const raw = await readJson(path.join(directory, 'package.json'));
					if (typeof raw === 'object' && raw !== null && !('version' in raw)) {
						return undefined;
					}
					return { directory, manifest: packageSchema.parse(raw) };
				} catch (error) {
					if (
						error instanceof Error &&
						'code' in error &&
						error.code === 'ENOENT'
					) {
						return undefined;
					}
					throw error;
				}
			})
	);
	return new Map(
		entries
			.filter((entry) => entry !== undefined)
			.map((entry) => [entry.manifest.name, entry])
	);
};

const localDependencies = (manifest: PackageManifest): string[] => {
	const dependencies = {
		...manifest.dependencies,
		...manifest.optionalDependencies,
	};
	for (const [name, specifier] of Object.entries(
		manifest.peerDependencies ?? {}
	)) {
		if (!manifest.peerDependenciesMeta?.[name]?.optional) {
			dependencies[name] = specifier;
		}
	}
	return Object.entries(dependencies)
		.filter(([, specifier]) => specifier.startsWith('workspace:'))
		.map(([name]) => name);
};
const dependencyClosure = (
	names: string[],
	packages: Map<string, WorkspacePackage>
): WorkspacePackage[] => {
	const queue = [...new Set(names)];
	const seen = new Set<string>();
	const result: WorkspacePackage[] = [];
	for (const name of queue) {
		if (!name || seen.has(name)) {
			continue;
		}
		const entry = packages.get(name);
		if (!entry) {
			throw new Error(`No local workspace package named ${name}.`);
		}
		seen.add(name);
		result.push(entry);
		queue.push(...localDependencies(entry.manifest));
	}
	return result;
};
const exportTargets = (value: unknown): string[] => {
	if (typeof value === 'string') {
		return value.startsWith('./') ? [value] : [];
	}
	if (typeof value !== 'object' || value === null) {
		return [];
	}
	return Object.values(value).flatMap(exportTargets);
};
const verifyBuild = async ({
	directory,
	manifest,
}: WorkspacePackage): Promise<void> => {
	const targets = [
		...exportTargets(manifest.exports),
		...[manifest.main, manifest.types].filter((value) => value !== undefined),
	];
	for (const target of new Set(targets)) {
		const file = path.resolve(
			directory,
			target.includes('*') ? target.slice(0, target.indexOf('*')) : target
		);
		if (!inside(directory, file)) {
			throw new Error(
				`Package export points outside ${manifest.name}: ${target}`
			);
		}
		try {
			await fs.access(file);
		} catch {
			throw new Error(
				`Build ${manifest.name} before preparing local packages. Missing ${target}. Run bun turbo run build --filter='${manifest.name}...' from the checkout root.`
			);
		}
	}
};
const stagedManifest = (manifest: PackageManifest): Record<string, unknown> => {
	const result: Record<string, unknown> = { ...manifest };
	delete result.devDependencies;
	delete result.scripts;
	// Bun cannot resolve repeated local tarballs in a dependency diamond.
	// The app plan installs the complete local closure directly instead.
	for (const section of [
		'dependencies',
		'optionalDependencies',
		'peerDependencies',
	] as const) {
		const values = Object.fromEntries(
			Object.entries(manifest[section] ?? {}).filter(
				([, specifier]) => !specifier.startsWith('workspace:')
			)
		);
		result[section] = values;
	}
	result.c15tLocalSnapshot = { requires: localDependencies(manifest) };
	return result;
};

/**
 * Prepare immutable local tarballs. This does not build, install, or publish packages.
 * @param options Checkout root and directly requested package names.
 * @returns The prepared snapshot manifest, including its transitive runtime packages.
 */
export const prepareBoilerplatePackages = async (options: {
	packageSource: string;
	dependencies: string[];
}): Promise<PreparedPackages> => {
	if (!options.dependencies.length) {
		throw new Error('Specify at least one package to prepare.');
	}
	const packageSource = await fs.realpath(options.packageSource);
	const packages = await readCheckout(packageSource);
	const closure = dependencyClosure(options.dependencies, packages);
	await Promise.all(closure.map(verifyBuild));
	const cache = path.join(packageSource, cacheDirectory);
	await fs.mkdir(cache, { recursive: true });
	const snapshot = await fs.mkdtemp(path.join(cache, 'snapshot-'));
	const staging = path.join(snapshot, 'stage');
	const tarballs = new Map(
		closure.map((entry) => [
			entry.manifest.name,
			path.join(
				snapshot,
				`${entry.manifest.name.replaceAll('/', '-').replaceAll('@', '')}.tgz`
			),
		])
	);
	const prepared: PreparedPackages = {
		closure: closure.map((entry) => entry.manifest.name),
		packageSource,
		packages: {},
		preparedAt: new Date().toISOString(),
		roots: [...new Set(options.dependencies)],
		schemaVersion: 1,
	};
	try {
		for (const entry of closure) {
			const { name } = entry.manifest;
			const tarball = tarballs.get(name);
			if (!tarball) {
				throw new Error(`Missing archive destination for ${name}.`);
			}
			const directory = path.join(
				staging,
				name.replaceAll('/', '-').replaceAll('@', '')
			);
			await fs.cp(entry.directory, directory, {
				filter: (source) =>
					!['node_modules', '.git', '.turbo', 'coverage', '.cache'].includes(
						path.basename(source)
					),
				recursive: true,
			});
			await fs.writeFile(
				path.join(directory, 'package.json'),
				`${JSON.stringify(stagedManifest(entry.manifest), null, 2)}\n`
			);
			await execute(
				'bun',
				['pm', 'pack', '--ignore-scripts', '--filename', tarball, '--quiet'],
				{ cwd: directory, maxBuffer: 1024 * 1024 }
			);
			prepared.packages[name] = {
				sha256: await digest(tarball),
				tarball,
				version: entry.manifest.version,
			};
		}
		await fs.rm(staging, { force: true, recursive: true });
		const manifestPath = path.join(cache, 'manifest.json');
		const pending = path.join(snapshot, 'manifest.json');
		await fs.writeFile(pending, `${JSON.stringify(prepared, null, 2)}\n`);
		await fs.rename(pending, manifestPath);
		return prepared;
	} catch (error) {
		await fs.rm(snapshot, { force: true, recursive: true });
		throw error;
	}
};

/** Plan dependency edits without installing packages or modifying the checkout. */
export const planBoilerplateDependencies = async (options: {
	projectRoot: string;
	dependencies: string[];
	packageSource?: string;
}): Promise<BoilerplateDependencyPlan> => {
	const names = [...new Set(options.dependencies)];
	const localNames = names.filter(
		(name) => name === 'c15t' || name.startsWith('@c15t/')
	);
	const externalNames = names.filter((name) => !localNames.includes(name));
	const externalInstructions = externalNames.map(
		(name) =>
			`External dependency ${name} must be installed separately; its existing version was not changed.`
	);
	if (!options.packageSource) {
		const instructions = [
			'Generated files target unpublished c15t APIs. No registry dependencies were added.',
		];
		if (localNames.length) {
			instructions.push(
				'To use a local build, pass --package-source <c15t-checkout-root>.',
				prepareInstruction(localNames)
			);
		}
		instructions.push(...externalInstructions);
		return {
			dependencies: names.map((name) => ({ name, specifier: null })),
			edits: [],
			instructions,
			source: { kind: 'files-only' },
		};
	}
	const packageSource = await fs.realpath(
		path.resolve(options.projectRoot, options.packageSource)
	);
	const workspaces = await readCheckout(packageSource);
	const requiredNames = dependencyClosure(localNames, workspaces).map(
		(entry) => entry.manifest.name
	);
	const cache = path.join(packageSource, cacheDirectory);
	let prepared: PreparedPackages;
	try {
		prepared = preparedSchema.parse(
			await readJson(path.join(cache, 'manifest.json'))
		);
	} catch {
		throw new Error(
			`No prepared local packages found in ${packageSource}. ${prepareInstruction(localNames)}`
		);
	}
	if (prepared.packageSource !== packageSource) {
		throw new Error(
			'Prepared packages belong to another checkout. Prepare them again in this checkout.'
		);
	}
	for (const archive of Object.values(prepared.packages)) {
		if (
			!inside(cache, archive.tarball) ||
			(await digest(archive.tarball)) !== archive.sha256
		) {
			throw new Error(
				'A prepared local archive is missing or changed. Prepare the packages again.'
			);
		}
	}
	const plannedDependencies = requiredNames.map((name) => {
		const preparedPackage = prepared.packages[name];
		if (!preparedPackage) {
			throw new Error(
				`Local snapshot does not include ${name}. ${prepareInstruction(localNames)}`
			);
		}
		return { name, specifier: `file:${preparedPackage.tarball}` };
	});
	const file = path.join(options.projectRoot, 'package.json');
	let before: string | null;
	try {
		before = await fs.readFile(file, 'utf8');
	} catch (error) {
		if (
			!(error instanceof Error && 'code' in error && error.code === 'ENOENT')
		) {
			throw error;
		}
		before = null;
	}
	const manifest = z
		.object({
			dependencies: stringMap.optional(),
			devDependencies: stringMap.optional(),
		})
		.passthrough()
		.parse(
			before === null ? { private: true, type: 'module' } : JSON.parse(before)
		);
	for (const dependency of plannedDependencies) {
		if (
			manifest.devDependencies?.[dependency.name] &&
			!manifest.dependencies?.[dependency.name]
		) {
			manifest.devDependencies[dependency.name] = dependency.specifier;
		} else {
			manifest.dependencies ??= {};
			manifest.dependencies[dependency.name] = dependency.specifier;
		}
	}
	const after = `${JSON.stringify(manifest, null, 2)}\n`;
	return {
		dependencies: [
			...plannedDependencies,
			...externalNames.map((name) => ({ name, specifier: null })),
		],
		edits: before === after ? [] : [{ after, before, path: file }],
		instructions: [
			'Using an unpublished local snapshot. Versions retain their checkout values; these are not registry releases.',
			'The package.json edit includes the complete local workspace dependency closure. Apply it, then run bun install.',
			'Keep the checkout cache available. Re-run preparation after rebuilding local packages.',
			...externalInstructions,
		],
		source: {
			kind: 'local-unpublished',
			packageSource,
			preparedAt: prepared.preparedAt,
		},
	};
};
