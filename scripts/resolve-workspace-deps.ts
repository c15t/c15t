/**
 * Resolves `workspace:*`, `workspace:^`, and `workspace:~` protocols
 * in all package.json files before publishing to npm.
 *
 * changesets + npm publish doesn't resolve these — only pnpm does natively.
 * This script bridges that gap for bun/npm-based publish flows.
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

async function getWorkspacePackages(): Promise<Map<string, string>> {
	const packages = new Map<string, string>();

	const dirs = ['packages', 'configs', 'internals'];
	for (const dir of dirs) {
		const dirPath = path.join(ROOT, dir);
		let entries: string[];
		try {
			entries = await readdir(dirPath);
		} catch {
			continue;
		}

		for (const entry of entries) {
			const pkgJsonPath = path.join(dirPath, entry, 'package.json');
			const file = Bun.file(pkgJsonPath);
			if (await file.exists()) {
				const pkg = await file.json();
				if (pkg.name && pkg.version) {
					packages.set(pkg.name, pkg.version);
				}
			}
		}
	}

	// Also check root-level example packages (if any are publishable)
	const rootPkgPath = path.join(ROOT, 'package.json');
	const rootPkg = await Bun.file(rootPkgPath).json();
	if (rootPkg.name && !rootPkg.private) {
		packages.set(rootPkg.name, rootPkg.version);
	}

	return packages;
}

function resolveWorkspaceProtocol(
	value: string,
	resolvedVersion: string
): string {
	if (value === 'workspace:*') {
		return resolvedVersion;
	}
	if (value === 'workspace:^') {
		return `^${resolvedVersion}`;
	}
	if (value === 'workspace:~') {
		return `~${resolvedVersion}`;
	}
	// workspace:^1.0.0 -> ^1.0.0
	if (value.startsWith('workspace:')) {
		return value.replace('workspace:', '');
	}
	return value;
}

async function resolveAllPackages() {
	const workspacePackages = await getWorkspacePackages();
	console.log(
		`Found ${workspacePackages.size} workspace packages:`,
		Object.fromEntries(workspacePackages)
	);

	const depFields = [
		'dependencies',
		'devDependencies',
		'peerDependencies',
		'optionalDependencies',
	] as const;

	let totalResolved = 0;

	for (const [pkgName, _version] of workspacePackages) {
		// Find the package.json for this package
		const dirs = ['packages', 'configs', 'internals'];
		for (const dir of dirs) {
			const dirPath = path.join(ROOT, dir);
			let entries: string[];
			try {
				entries = await readdir(dirPath);
			} catch {
				continue;
			}

			for (const entry of entries) {
				const pkgJsonPath = path.join(dirPath, entry, 'package.json');
				const file = Bun.file(pkgJsonPath);
				if (!(await file.exists())) continue;

				const pkg = await file.json();
				if (pkg.name !== pkgName) continue;

				let modified = false;
				for (const field of depFields) {
					const deps = pkg[field];
					if (!deps) continue;

					for (const [depName, depValue] of Object.entries(deps)) {
						if (
							typeof depValue === 'string' &&
							depValue.startsWith('workspace:')
						) {
							const resolvedVersion = workspacePackages.get(depName);
							if (resolvedVersion) {
								const resolved = resolveWorkspaceProtocol(
									depValue,
									resolvedVersion
								);
								deps[depName] = resolved;
								console.log(
									`  ${pkg.name}: ${depName} ${depValue} -> ${resolved}`
								);
								modified = true;
								totalResolved++;
							} else {
								console.warn(
									`  ${pkg.name}: ${depName} ${depValue} -> NOT FOUND in workspace`
								);
							}
						}
					}
				}

				if (modified) {
					await Bun.write(pkgJsonPath, `${JSON.stringify(pkg, null, '\t')}\n`);
				}
			}
		}
	}

	console.log(`\nResolved ${totalResolved} workspace: references.`);
}

resolveAllPackages().catch((err) => {
	console.error('Failed to resolve workspace dependencies:', err);
	process.exit(1);
});
