import fs from 'node:fs/promises';
import path from 'node:path';

import { parse } from '@babel/parser';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages');
/** Collect actual module literals without matching examples or literal types. */
const collectModuleSpecifiers = function collectModuleSpecifiers(source) {
	const ast = parse(source, {
		attachComment: false,
		plugins: [['typescript', { dts: true }]],
		sourceType: 'module',
	});
	const specifiers = [];
	const pending = [ast.program];
	while (pending.length > 0) {
		const node = pending.pop();
		if (!node || typeof node !== 'object') {
			continue;
		}
		if (Array.isArray(node)) {
			pending.push(...node);
			continue;
		}
		if (typeof node.type !== 'string') {
			continue;
		}
		if (
			node.type === 'ImportDeclaration' ||
			node.type === 'ExportNamedDeclaration' ||
			node.type === 'ExportAllDeclaration'
		) {
			if (node.source) {
				specifiers.push(node.source);
			}
		} else if (node.type === 'TSImportType') {
			specifiers.push(node.argument);
		}
		pending.push(...Object.values(node));
	}
	return specifiers.sort((left, right) => right.start - left.start);
};

async function discoverPackageTargets() {
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
}

const PACKAGE_TARGETS = await discoverPackageTargets();

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

/** Emit a runtime-compatible path for a declaration in the same package. */
function toExplicitRelativeSpecifier(fromFilePath, targetFilePath) {
	let relativePath = normalizePath(
		path.relative(path.dirname(fromFilePath), targetFilePath)
	);

	if (!relativePath.startsWith('.')) {
		relativePath = `./${relativePath}`;
	}

	if (relativePath.endsWith('.d.ts')) {
		return `${relativePath.slice(0, -'.d.ts'.length)}.js`;
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

/** Locate declarations for source and already-normalized JavaScript specifiers. */
async function resolveDeclarationTarget(fromFilePath, specifier) {
	if (!specifier.startsWith('.')) {
		return null;
	}

	const resolvedBasePath = path.resolve(path.dirname(fromFilePath), specifier);
	const candidatePaths = [
		resolvedBasePath,
		`${resolvedBasePath.replace(/\.js$/u, '')}.d.ts`,
		path.join(resolvedBasePath, 'index.d.ts'),
	];

	for (const candidatePath of candidatePaths) {
		if (await fileExists(candidatePath)) {
			return candidatePath;
		}
	}

	return null;
}

/** Rewrite module literals in a declaration while preserving all other text. */
async function normalizeDeclarationFile(filePath, currentTarget) {
	const original = await fs.readFile(filePath, 'utf8');
	const matches = collectModuleSpecifiers(original);

	if (matches.length === 0) {
		return;
	}

	const resolvedSpecifiers = new Map();

	for (const { value: specifier } of matches) {
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

	// Replace from right to left so parser offsets stay valid. Keep every
	// byte outside module literals, including comments and literal types.
	for (const { start, end, value } of matches) {
		const specifier = resolvedSpecifiers.get(value) ?? value;
		if (specifier === value) {
			continue;
		}
		const quote = original[start];
		const escaped = JSON.stringify(specifier).slice(1, -1);
		const replacement =
			quote === "'" ? escaped.replaceAll("'", "\\'") : escaped;
		normalized = `${normalized.slice(0, start)}${quote}${replacement}${quote}${normalized.slice(end)}`;
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
