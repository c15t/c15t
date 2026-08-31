import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages');
const SPECIFIER_REGEXES = [
	/(?<capture1>from\s+['"])(?<capture2>[^'"]+)(?<capture3>['"])/gu,
	/(?<capture1>import\(\s*['"])(?<capture2>[^'"]+)(?<capture3>['"]\s*\))/gu,
];

const discoverPackageTargets = async function discoverPackageTargets() {
	try {
		const entries = await fs.readdir(PACKAGES_ROOT, { withFileTypes: true });
		const packageTargets = await Promise.all(
			entries
				.filter((entry) => entry.isDirectory())
				.map(async (entry) => {
					const packageRoot = path.join(PACKAGES_ROOT, entry.name);
					const packageJsonPath = path.join(packageRoot, 'package.json');

					try {
						const packageJson = JSON.parse(
							await fs.readFile(packageJsonPath, 'utf8')
						);

						if (
							!packageJson ||
							typeof packageJson !== 'object' ||
							typeof packageJson.name !== 'string'
						) {
							return null;
						}

						return {
							distDir: path.join(packageRoot, 'dist-types'),
							specifier: packageJson.name,
						};
					} catch (error) {
						if (
							error &&
							typeof error === 'object' &&
							'code' in error &&
							error.code === 'ENOENT'
						) {
							return null;
						}

						throw error;
					}
				})
		);

		return packageTargets.filter(Boolean);
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'ENOENT') {
				return [];
			}
		}

		throw error;
	}
};

const PACKAGE_TARGETS = await discoverPackageTargets();

const normalizePath = function normalizePath(filePath) {
	return filePath.split(path.sep).join('/');
};

const findPackageTarget = function findPackageTarget(filePath) {
	const normalizedPath = path.resolve(filePath);

	return PACKAGE_TARGETS.find(({ distDir }) => {
		const normalizedDistDir = path.resolve(distDir);
		return (
			normalizedPath === normalizedDistDir ||
			normalizedPath.startsWith(`${normalizedDistDir}${path.sep}`)
		);
	});
};

const toPackageSpecifier = function toPackageSpecifier(targetFilePath, target) {
	const relativePath = normalizePath(
		path.relative(target.distDir, targetFilePath)
	);

	if (relativePath === 'index.d.ts') {
		return target.specifier;
	}

	if (relativePath.endsWith('/index.d.ts')) {
		return `${target.specifier}/${relativePath.slice(0, -'/index.d.ts'.length)}`;
	}

	if (relativePath.endsWith('.d.ts')) {
		return `${target.specifier}/${relativePath.slice(0, -'.d.ts'.length)}`;
	}

	return target.specifier;
};

const toExplicitRelativeSpecifier = function toExplicitRelativeSpecifier(
	fromFilePath,
	targetFilePath
) {
	let relativePath = normalizePath(
		path.relative(path.dirname(fromFilePath), targetFilePath)
	);

	if (!relativePath.startsWith('.')) {
		relativePath = `./${relativePath}`;
	}

	if (relativePath.endsWith('/index.d.ts')) {
		return relativePath.slice(0, -'/index.d.ts'.length);
	}

	if (relativePath.endsWith('.d.ts')) {
		return relativePath.slice(0, -'.d.ts'.length);
	}

	return relativePath;
};

const fileExists = async function fileExists(filePath) {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
};

const collectDeclarationFiles = async function collectDeclarationFiles(
	directory
) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				return collectDeclarationFiles(entryPath);
			}

			return entry.name.endsWith('.d.ts') ? [entryPath] : [];
		})
	);

	return files.flat();
};

const resolveDeclarationTarget = async function resolveDeclarationTarget(
	fromFilePath,
	specifier
) {
	if (!specifier.startsWith('.')) {
		return null;
	}

	const resolvedBasePath = path.resolve(path.dirname(fromFilePath), specifier);
	const candidatePaths = [
		resolvedBasePath,
		`${resolvedBasePath}.d.ts`,
		path.join(resolvedBasePath, 'index.d.ts'),
	];

	for (const candidatePath of candidatePaths) {
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		if (await fileExists(candidatePath)) {
			return candidatePath;
		}
	}

	return null;
};

const normalizeDeclarationFile = async function normalizeDeclarationFile(
	filePath,
	currentTarget
) {
	const original = await fs.readFile(filePath, 'utf8');
	const matches = SPECIFIER_REGEXES.flatMap((regex) =>
		Array.from(original.matchAll(regex))
	);

	if (matches.length === 0) {
		return;
	}

	const resolvedSpecifiers = new Map();

	for (const [, , specifier] of matches) {
		if (resolvedSpecifiers.has(specifier)) {
			continue;
		}

		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		const targetFilePath = await resolveDeclarationTarget(filePath, specifier);
		if (!targetFilePath) {
			resolvedSpecifiers.set(specifier, specifier);
			continue;
		}

		const targetPackage = findPackageTarget(targetFilePath);
		if (!targetPackage) {
			resolvedSpecifiers.set(specifier, specifier);
			continue;
		}

		if (targetPackage.distDir === currentTarget.distDir) {
			resolvedSpecifiers.set(
				specifier,
				toExplicitRelativeSpecifier(filePath, targetFilePath)
			);
			continue;
		}

		resolvedSpecifiers.set(
			specifier,
			toPackageSpecifier(targetFilePath, targetPackage)
		);
	}

	let normalized = original;

	for (const regex of SPECIFIER_REGEXES) {
		normalized = normalized.replace(
			regex,
			(fullMatch, prefix, specifier, suffix) =>
				`${prefix}${resolvedSpecifiers.get(specifier) ?? specifier}${suffix}`
		);
	}

	if (normalized !== original) {
		await fs.writeFile(filePath, normalized);
	}
};

const main = async function main() {
	const packageRoot = process.cwd();
	const distTypesDir = path.join(packageRoot, 'dist-types');
	const currentTarget = findPackageTarget(distTypesDir);

	if (!currentTarget) {
		return;
	}

	try {
		const files = await collectDeclarationFiles(distTypesDir);
		await Array.from(files).reduce(async (previousIteration, filePath) => {
			await previousIteration;
			await normalizeDeclarationFile(filePath, currentTarget);
		}, Promise.resolve());
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'ENOENT') {
				return;
			}
		}

		throw error;
	}
};

await main();
