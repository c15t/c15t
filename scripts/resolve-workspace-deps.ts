#!/usr/bin/env tsx

/**
 * Resolves `workspace:*`, `workspace:^`, and `workspace:~` protocols
 * in workspace package manifests before publishing to npm.
 *
 * changesets + npm publish doesn't resolve these automatically.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveWorkspaceProtocol } from './workspace-protocol';

interface PackageJson {
	name?: string;
	version?: string;
	private?: boolean;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

interface WorkspacePackage {
	path: string;
	manifest: PackageJson;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_DIRS = ['packages', 'configs', 'internals'];
const DEP_FIELDS = [
	'dependencies',
	'devDependencies',
	'peerDependencies',
	'optionalDependencies',
] as const;

const listDirs = async function listDirs(dirPath: string): Promise<string[]> {
	try {
		const entries = await readdir(dirPath, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
	} catch {
		return [];
	}
};

const readPackageJson = async function readPackageJson(
	packageJsonPath: string
): Promise<PackageJson | null> {
	try {
		const raw = await readFile(packageJsonPath, 'utf8');
		return JSON.parse(raw) as PackageJson;
	} catch {
		return null;
	}
};

const getWorkspacePackages = async function getWorkspacePackages(): Promise<
	WorkspacePackage[]
> {
	const workspacePackages: WorkspacePackage[] = [];

	for (const workspaceDir of WORKSPACE_DIRS) {
		const workspaceDirPath = path.join(ROOT, workspaceDir);
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		const subDirs = await listDirs(workspaceDirPath);

		for (const subDir of subDirs) {
			const packageJsonPath = path.join(
				workspaceDirPath,
				subDir,
				'package.json'
			);
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const manifest = await readPackageJson(packageJsonPath);
			if (!manifest?.name) {
				continue;
			}

			workspacePackages.push({
				manifest,
				path: packageJsonPath,
			});
		}
	}

	const rootManifestPath = path.join(ROOT, 'package.json');
	const rootManifest = await readPackageJson(rootManifestPath);
	if (rootManifest?.name && !rootManifest.private) {
		workspacePackages.push({
			manifest: rootManifest,
			path: rootManifestPath,
		});
	}

	return workspacePackages;
};

const resolveAllWorkspaceDependencies =
	async function resolveAllWorkspaceDependencies() {
		const workspacePackages = await getWorkspacePackages();
		const versionByPackageName = new Map<string, string>();

		for (const pkg of workspacePackages) {
			if (pkg.manifest.name && pkg.manifest.version) {
				versionByPackageName.set(pkg.manifest.name, pkg.manifest.version);
			}
		}

		console.log(
			`Found ${versionByPackageName.size} workspace packages:`,
			Object.fromEntries(versionByPackageName)
		);

		let totalResolved = 0;

		for (const pkg of workspacePackages) {
			let modified = false;

			for (const field of DEP_FIELDS) {
				const deps = pkg.manifest[field];
				if (!deps) {
					continue;
				}

				for (const [depName, depRange] of Object.entries(deps)) {
					if (!depRange.startsWith('workspace:')) {
						continue;
					}

					const resolvedVersion = versionByPackageName.get(depName);
					if (!resolvedVersion) {
						console.warn(
							`  ${pkg.manifest.name}: ${depName} ${depRange} -> NOT FOUND in workspace`
						);
						continue;
					}

					const resolvedRange = resolveWorkspaceProtocol(
						depRange,
						resolvedVersion
					);
					if (resolvedRange !== depRange) {
						deps[depName] = resolvedRange;
						console.log(
							`  ${pkg.manifest.name}: ${depName} ${depRange} -> ${resolvedRange}`
						);
						modified = true;
						totalResolved += 1;
					}
				}
			}

			if (modified) {
				// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
				await writeFile(
					pkg.path,
					`${JSON.stringify(pkg.manifest, null, '\t')}\n`
				);
			}
		}

		console.log(`\nResolved ${totalResolved} workspace: references.`);
	};

try {
	await resolveAllWorkspaceDependencies();
} catch (error) {
	console.error('Failed to resolve workspace dependencies:', error);
	process.exit(1);
}
