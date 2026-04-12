import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SPECIFIER_REGEXES = [
	/(from\s+['"])([^'"]+)(['"])/g,
	/(import\(\s*['"])([^'"]+)(['"]\s*\))/g,
];
const PACKAGE_TARGETS = [
	{
		distDir: path.join(REPO_ROOT, 'packages/core/dist-types'),
		specifier: 'c15t',
	},
	{
		distDir: path.join(REPO_ROOT, 'packages/iab/dist-types'),
		specifier: '@c15t/iab',
	},
	{
		distDir: path.join(REPO_ROOT, 'packages/nextjs/dist-types'),
		specifier: '@c15t/nextjs',
	},
	{
		distDir: path.join(REPO_ROOT, 'packages/react/dist-types'),
		specifier: '@c15t/react',
	},
	{
		distDir: path.join(REPO_ROOT, 'packages/schema/dist-types'),
		specifier: '@c15t/schema',
	},
	{
		distDir: path.join(REPO_ROOT, 'packages/translations/dist-types'),
		specifier: '@c15t/translations',
	},
	{
		distDir: path.join(REPO_ROOT, 'packages/ui/dist-types'),
		specifier: '@c15t/ui',
	},
];

function normalizePath(filePath) {
	return filePath.split(path.sep).join('/');
}

function findPackageTarget(filePath) {
	const normalizedPath = path.resolve(filePath);

	return PACKAGE_TARGETS.find(({ distDir }) => {
		const normalizedDistDir = path.resolve(distDir);
		return (
			normalizedPath === normalizedDistDir ||
			normalizedPath.startsWith(`${normalizedDistDir}${path.sep}`)
		);
	});
}

function toPackageSpecifier(targetFilePath, target) {
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
}

function toExplicitRelativeSpecifier(fromFilePath, targetFilePath) {
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
}

async function fileExists(filePath) {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
}

async function collectDeclarationFiles(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				return collectDeclarationFiles(entryPath);
			}

			return entry.name.endsWith('.d.ts') ? [entryPath] : [];
		})
	);

	return files.flat();
}

async function resolveDeclarationTarget(fromFilePath, specifier) {
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
		if (await fileExists(candidatePath)) {
			return candidatePath;
		}
	}

	return null;
}

async function normalizeDeclarationFile(filePath, currentTarget) {
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
}

async function main() {
	const packageRoot = process.cwd();
	const distTypesDir = path.join(packageRoot, 'dist-types');
	const currentTarget = findPackageTarget(distTypesDir);

	if (!currentTarget) {
		return;
	}

	try {
		const files = await collectDeclarationFiles(distTypesDir);
		for (const filePath of files) {
			await normalizeDeclarationFile(filePath, currentTarget);
		}
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'ENOENT') {
				return;
			}
		}

		throw error;
	}
}

await main();
