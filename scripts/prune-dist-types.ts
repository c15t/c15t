import { lstatSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { normalizePackagePath } from './manifest-utils';

const declarationPattern = /\.d\.(?:ts|mts|cts)$/u;

/** Remove declarations unreachable from explicit public type entry points. */
export const pruneDistTypes = function pruneDistTypes(
	packageDir: string
): string[] {
	const root = resolve(packageDir);
	const output = join(root, 'dist-types');
	if (lstatSync(output).isSymbolicLink()) {
		throw new Error(`Declaration output is a symlink: ${output}`);
	}
	const manifest = JSON.parse(
		readFileSync(join(root, 'package.json'), 'utf8')
	) as Record<string, unknown>;
	// These routes need their own resolver before pruning can support them.
	for (const key of ['typesVersions', 'typings', 'imports']) {
		if (manifest[key] !== undefined) {
			throw new Error(`Declaration pruning does not support ${key}.`);
		}
	}
	const files = new Set<string>();
	const walk = function walk(directory: string): void {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.name === 'package.json') {
				throw new Error(
					`Nested declaration package manifests are unsupported: ${path}`
				);
			}
			if (entry.isSymbolicLink()) {
				throw new Error(`Declaration output contains a symlink: ${path}`);
			}
			if (entry.isDirectory()) {
				walk(path);
			} else if (declarationPattern.test(path)) {
				files.add(path);
			}
		}
	};
	walk(output);
	const pending = new Set<string>();
	const addTargets = function addTargets(
		value: unknown,
		typeCondition = false
	): void {
		if (typeof value === 'string') {
			if (!declarationPattern.test(value)) {
				if (
					typeCondition ||
					normalizePackagePath(value)?.startsWith('dist-types/')
				) {
					throw new Error(`Unsupported public declaration target: ${value}`);
				}
				return;
			}
			const target = normalizePackagePath(value);
			if (!target?.startsWith('dist-types/')) {
				throw new Error(`Public declaration is outside dist-types: ${value}`);
			}
			const [prefix = '', suffix = '', ...extra] = target.split('*');
			if (extra.length > 0) {
				throw new Error(`Unsupported declaration wildcard: ${value}`);
			}
			const matches = [...files].filter((file) => {
				const path = relative(root, file).replaceAll('\\', '/');
				return target.includes('*')
					? path.startsWith(prefix) &&
							path.endsWith(suffix) &&
							path.length >= prefix.length + suffix.length
					: path === target;
			});
			if (matches.length === 0) {
				throw new Error(`Missing public declaration: ${value}`);
			}
			for (const file of matches) {
				pending.add(file);
			}
		} else if (value && typeof value === 'object') {
			for (const [key, nested] of Object.entries(value)) {
				addTargets(
					nested,
					typeCondition || key === 'types' || key.startsWith('types@')
				);
			}
		}
	};
	addTargets(manifest.types, true);
	addTargets(manifest.exports);
	if (pending.size === 0) {
		throw new Error(
			'Declaration pruning requires explicit public type entries.'
		);
	}
	// Ambient declarations can affect consumers without a direct import edge.
	for (const file of files) {
		const source = ts.createSourceFile(
			file,
			readFileSync(file, 'utf8'),
			ts.ScriptTarget.Latest
		);
		if (
			!ts.isExternalModule(source) ||
			source.statements.some(ts.isModuleDeclaration)
		) {
			pending.add(file);
		}
	}
	const reachable = new Set<string>();
	const isUnsupportedReference = (specifier: string): boolean =>
		specifier.startsWith('#') ||
		specifier.startsWith('~') ||
		specifier.startsWith('/') ||
		specifier.includes('\\') ||
		specifier === manifest.name ||
		specifier.startsWith(`${manifest.name}/`);
	for (const file of pending) {
		reachable.add(file);
		const info = ts.preProcessFile(readFileSync(file, 'utf8'), true, true);
		if (
			info.typeReferenceDirectives.some(
				({ fileName }) =>
					fileName.startsWith('.') || isUnsupportedReference(fileName)
			)
		) {
			throw new Error(`Unsupported local type reference in ${file}`);
		}
		for (const reference of [...info.importedFiles, ...info.referencedFiles]) {
			const specifier = reference.fileName;
			if (!specifier.startsWith('.')) {
				if (
					info.referencedFiles.includes(reference) ||
					isUnsupportedReference(specifier)
				) {
					throw new Error(`Unsupported declaration reference: ${specifier}`);
				}
				continue;
			}
			const base = resolve(dirname(file), specifier);
			let candidates: string[];
			if (declarationPattern.test(base)) {
				candidates = [base];
			} else if (/\.(?:mjs|mts)$/u.test(base)) {
				candidates = [base.replace(/\.(?:mjs|mts)$/u, '.d.mts')];
			} else if (/\.(?:cjs|cts)$/u.test(base)) {
				candidates = [base.replace(/\.(?:cjs|cts)$/u, '.d.cts')];
			} else if (/\.(?:js|ts)$/u.test(base)) {
				candidates = [base.replace(/\.(?:js|ts)$/u, '.d.ts')];
			} else {
				candidates = [`${base}.d.ts`, join(base, 'index.d.ts')];
			}
			const target = candidates.find((candidate) => files.has(candidate));
			if (!target) {
				throw new Error(
					`Unresolved declaration reference in ${file}: ${specifier}`
				);
			}
			pending.add(target);
		}
	}
	// Resolve the complete graph before deleting anything.
	const removed = [...files].filter((file) => !reachable.has(file));
	for (const file of removed) {
		unlinkSync(file);
	}
	return removed.map((file) => relative(root, file));
};

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const removed = pruneDistTypes(process.cwd());
	console.log(`Removed ${removed.length} unreachable declaration files.`);
}
